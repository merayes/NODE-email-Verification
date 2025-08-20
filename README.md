NODE-email-Verification
This project provides a straightforward solution for integrating email verification functionality into your Node.js application. It offers a secure method to confirm the validity and ownership of email addresses during user registration.

Features
Easy Integration: Quickly incorporate it into your existing Node.js project.

Secure Token Generation: Creates unique and secure verification tokens for each user.

Customizable Email Templates: Allows you to modify the content and appearance of verification emails to match your branding.

Verification Status Management: Tracks and manages the verification status of users.

Installation
Clone the repository:

Bash

git clone https://github.com/merayes/NODE-email-Verification.git
cd NODE-email-Verification
Install the necessary packages:

Bash

npm install
Configuration
.env File
Create a .env file in the project's root directory and add the following variables.

PORT=3000
GMAIL_USER=örnek07@gmail.com
GMAIL_PASS=orneksifre ## You'll need 2FA + an App Password in your Google account
JWT_SECRET=your_jwt_secret_key
BASE_URL=http://localhost:3000
PORT: The port number where the application will run.

GMAIL_USER: Your Gmail account's email address.

GMAIL_PASS: The App Password you generated after enabling 2-Step Verification (2FA) in your Google account. This is required because Google won't allow you to send emails using your regular account password.

JWT_SECRET: A random, strong secret key for token generation.

BASE_URL: The base URL where your application is running.

Usage
This project handles the email verification process in three main steps:

Registration: During user registration, the email address and other user details are sent to the POST /register endpoint. The system generates a verification token and sends a verification email to the user.

Email Verification: The user clicks on the verification link in their email. This link directs the token to the GET /verify/:token endpoint.

Token Validation: The server validates the token and updates the user's verification status.

An example of the complete verification flow is included in the routes/auth.js file. You can adapt this structure to fit your application's logic.

Contributing
If you'd like to contribute, please feel free to submit a pull request.

Fork this repository.

Create a new feature branch (git checkout -b feature/AmazingFeature).

Commit your changes (git commit -m 'Add some AmazingFeature').

Push to the branch (git push origin feature/AmazingFeature).

Open a Pull Request.
