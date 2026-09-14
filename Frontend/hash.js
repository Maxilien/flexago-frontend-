const bcrypt = require("bcryptjs");

const password = "Possible10";   // <-- your new password

const hash = bcrypt.hashSync(password, 10);

console.log("New hashed password:");
console.log(hash);
