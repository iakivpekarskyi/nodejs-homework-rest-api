require("dotenv").config();
const nodemailer = require("nodemailer");
const { UKRNET_PASSWORD, UKRNET_EMAIL } = process.env;

const nodemailerConfig = {
  host: "smtp.ukr.net",
  port: 465,
  secure: true,
  auth: {
    user: UKRNET_EMAIL,
    pass: UKRNET_PASSWORD,
  },
};

const transport = nodemailer.createTransport(nodemailerConfig);

const data = {
  to: "ceroy60836@zamaneta.com",
  subject: "test email",
  html: "test test test",
};

//   .then(() => console.log("Email send success"))
//   .catch((error) => console.log(error.message));

const sendEmail = (data) => {
  const email = { ...data, from: UKRNET_EMAIL };
  return transport.sendMail(email);
};

module.exports = sendEmail;
