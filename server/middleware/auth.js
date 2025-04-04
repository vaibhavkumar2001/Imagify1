import jwt from "jsonwebtoken";
import userModel from "../models/user.model.js";

const userAuth = async (req, res, next) => {
    try {
        // 🔴 Ensure token is present
        const token = req.header("token");
        if (!token) {
            return res.status(401).json({ success: false, message: "No token provided" });
        }

        // 🔵 Decode token
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log("Decoded Token:", decoded);

        // 🔴 Fetch user from DB
        const user = await userModel.findById(decoded.id);
        console.log("Authenticated User:", user);

        if (!user) {
            return res.status(401).json({ success: false, message: "User not found" });
        }

        req.user = user; // 🔵 Attach user to request
        next();
    } catch (error) {
        console.error("Authentication Error:", error);
        res.status(401).json({ success: false, message: "Invalid token" });
    }
};

export default userAuth;
