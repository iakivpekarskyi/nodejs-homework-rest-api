const fs = require('fs/promises');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const gravatar = require('gravatar');
const shortid = require('shortid');

const HttpError = require('../helpers/HttpError');
const sendEmail = require('../helpers/sendEmail');

const { User } = require('../models/User');

const ctrlWrapper = require('../decorators/ctrlWrapper');

const avatarPath = path.resolve('public', 'avatars');

const { JWT_SECRET, BASE_URL } = process.env;

const signup = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (user) {
    throw HttpError(409, `${email} already in use`);
  }

  const hashPassword = await bcrypt.hash(password, 10);
  const avatarUrl = gravatar.url(email);
  const verificationCode = shortid.generate();

  const newUser = await User.create({
    ...req.body,
    password: hashPassword,
    avatarUrl,
    verificationCode,
  });

  const verifyEmail = {
    to: email,
    subject: 'Verify email',
    html: `<a target = "_blank" href = "${BASE_URL}/api/auth/verify/${verificationCode}" >Click to verify email </a>`,
  };

  await sendEmail(verifyEmail);

  res.status(201).json({
    email: newUser.email,
  });
};

const verify = async (req, res) => {
  const { verificationCode } = req.params;
  const user = await User.findOne({ verificationCode });
  if (!user) {
    throw HttpError(404, ' User not found');
  }
  await User.findByIdAndUpdate(user._id, {
    verify: true,
    verificationCode: '',
  });
  res.json({
    message: 'Verify success',
  });
};

const resendVerifyEmail = async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email });
  if (user.very) {
    throw HttpError(404, ' Email not found');
  }
  if (user.verify) {
    throw HttpError(400, ' Email already is verified');
  }

  const verifyEmail = {
    to: email,
    subject: 'Verify email',
    html: `<a target = "_blank" href = "${BASE_URL}/api/auth/verify/${user.verificationCode}" >Click to verify email </a>`,
  };

  await sendEmail(verifyEmail);

  res.json({
    message: 'Verify email send',
  });
};

const signin = async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email });
  if (!user) {
    throw HttpError(401, 'Email or password is wrong');
  }

  console.log('Verification status:', user.verify);

  if (!user.verify) {
    throw HttpError(401, 'Email is not verified');
  }

  const passwordCompare = await bcrypt.compare(password, user.password);
  if (!passwordCompare) {
    throw HttpError(401, 'Email or password is wrong');
  }

  const payload = {
    id: user._id,
  };

  console.log('JWT_SECRET:', process.env.JWT_SECRET);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '23h' });

  await User.findByIdAndUpdate(user._id, { token });

  res.json({ token });
};

const getCurrent = async (req, res) => {
  const { email } = req.user;
  res.json({
    email,
  });
};

const signout = async (req, res) => {
  const { _id } = req.user;
  await User.findByIdAndUpdate(_id, { token: '' });
  res.json({
    message: 'Sign out success',
  });
};

const updateAvatar = async (req, res) => {
  const { _id } = req.user;
  const { path: oldPath, filename } = req.file;
  const avatarname = `${_id}_${filename}`;
  const newPath = path.join(avatarPath, avatarname);
  await fs.rename(oldPath, newPath);
  const avatarUrl = path.join('avatars', avatarname);
  await User.findByIdAndUpdate(_id, { avatarUrl });

  res.json({
    avatarUrl,
  });
};

module.exports = {
  signup: ctrlWrapper(signup),
  signin: ctrlWrapper(signin),
  verify: ctrlWrapper(verify),
  resendVerifyEmail: ctrlWrapper(resendVerifyEmail),
  getCurrent: ctrlWrapper(getCurrent),
  signout: ctrlWrapper(signout),
  updateAvatar: ctrlWrapper(updateAvatar),
};
