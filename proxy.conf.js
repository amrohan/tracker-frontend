const target = process.env["API_URL"] || "http://localhost:5080";

module.exports = {
  "/api": {
    target,
    // Only skip TLS verification for http targets; a real https target (like your
    // Let's Encrypt-backed tb.amrohan.in) should be verified normally.
    secure: target.startsWith("https"),
    changeOrigin: true,
  },
};
