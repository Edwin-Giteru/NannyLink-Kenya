/**
 * Decodes a JWT token payload without a library
 * @param {string} token 
 * @returns {object|null}
 */
function decodeToken(token) {
    try {
        const base64Url = token.split('.')[1]; // Get payload segment
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));

        return JSON.parse(jsonPayload);
    } catch (e) {
        console.error("Token decoding failed:", e);
        return null;
    }
}