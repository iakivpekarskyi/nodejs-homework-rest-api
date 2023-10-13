const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const HttpError = require("../helpers/HttpError");

const { User } = require("../models/User");

const ctrlWrapper = require("../decorators/ctrlWrapper");

const { JWT_SECRET } = process.env;

const signup = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (user) {
    throw HttpError(409, `${email} already in use`);
  }

  const hashPassword = await bcrypt.hash(password, 10);

  const newUser = await User.create({ ...req.body, password: hashPassword });
  res.status(201).json({
    email: newUser.email,
  });
};

const signin = async (req, res) => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    throw HttpError(401, "Email or password is wrong");
  }
  const passwordCompare = await bcrypt.compare(password, user.password);
  if (!passwordCompare) {
    throw HttpError(401, "Email or password is wrong");
  }

  const payload = {
    id: user._id,
  };

  console.log("JWT_SECRET:", process.env.JWT_SECRET);
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: "23h" });
  res.json({ token });
};

module.exports = {
  signup: ctrlWrapper(signup),
  signin: ctrlWrapper(signin),
};