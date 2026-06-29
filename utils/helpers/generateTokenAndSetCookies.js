const jwt = require("jsonwebtoken");
const { getAuthCookieOptions } = require("./cookieOptions");

const generteTokenAndSetCookie = (userId, res) => {
    const token = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
    res.cookie("jwt", token, getAuthCookieOptions());
    return token;
};

module.exports = generteTokenAndSetCookie;
