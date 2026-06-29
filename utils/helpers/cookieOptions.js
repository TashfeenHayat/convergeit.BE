const getAuthCookieOptions = () => {
    const isProduction = process.env.NODE_ENV === "production";
    return {
        httpOnly: true,
        maxAge: 7 * 24 * 60 * 60 * 1000,
        sameSite: isProduction ? "none" : "lax",
        secure: isProduction,
        path: "/",
    };
};

const getClearAuthCookieOptions = () => ({
    ...getAuthCookieOptions(),
    maxAge: 0,
});

module.exports = { getAuthCookieOptions, getClearAuthCookieOptions };
