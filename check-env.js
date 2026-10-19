import dotenv from "dotenv";
dotenv.config();

const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
const pk = process.env.GOOGLE_PRIVATE_KEY;

console.log("Email:", email ? email : "MISSING");
console.log("PK length:", pk ? pk.length : 0);
console.log("PK includes \\n:", pk ? pk.includes('\\n') : false);
console.log("PK includes actual newlines:", pk ? pk.includes('\n') : false);
