import axios from "axios";

export const sendEmail = async ({ to, subject, html }) => {
  try {
    const response = await axios.post(
      "https://api.brevo.com/v3/smtp/email",
      {
        sender: {
          name: "WallMind",
          email: "lakshyadewangan78@gmail.com", // MUST be verified in Brevo
        },
        to: [
          {
            email: to,
          },
        ],
        subject: subject,
        htmlContent: html,
      },
      {
        headers: {
          "api-key": process.env.BREVO_API_KEY,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      }
    );

    console.log("Email sent:", response.data);
  } catch (error) {
    console.error(
      "Brevo Error:",
      error.response?.data || error.message
    );
  }
};