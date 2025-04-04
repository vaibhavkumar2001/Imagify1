import axios from 'axios';  // ✅ Import axios
import userModel from '../models/user.model.js';
import FormData from 'form-data';

export const generateImage = async (req, res) => {
    try {
        console.log("Request Headers:", req.headers);
        console.log("Request Body:", req.body);

        const user = req.user;
        console.log("User Data:", user);

        const { prompt } = req.body;
        if (!user || !prompt) {
            return res.status(400).json({
                success: false,
                message: "User or prompt is missing",
            });
        }

        if (typeof user.creditBalance !== "number" || isNaN(user.creditBalance)) {
            return res.status(500).json({
                success: false,
                message: "Invalid credit balance detected",
                userData: user,
            });
        }

        if (user.creditBalance <= 0) {
            return res.json({
                success: false,
                message: "No Credit Balance",
                creditBalance: user.creditBalance,
            });
        }

        if (!process.env.CLIPDROP_API) {
            return res.status(500).json({ success: false, message: "API Key is missing" });
        }

        const formData = new FormData();
        formData.append("prompt", prompt);

        const { data } = await axios.post(  // ✅ Axios is now defined
            "https://clipdrop-api.co/text-to-image/v1",
            formData,
            {
                headers: {
                    "x-api-key": process.env.CLIPDROP_API,
                    ...formData.getHeaders(),
                },
                responseType: "arraybuffer",
            }
        );

        const base64Image = Buffer.from(data, "binary").toString("base64");
        const resultImage = `data:image/png;base64,${base64Image}`;

        const updatedUser = await userModel.findByIdAndUpdate(
            user._id,
            { $inc: { creditBalance: -1 } },
            { new: true, runValidators: true }
        );

        res.json({
            success: true,
            message: "Image Generated",
            creditBalance: updatedUser.creditBalance,
            resultImage,
        });

    } catch (error) {
        console.error("Error in generateImage:", error);
        res.status(500).json({
            success: false,
            message: error.message,
        });
    }
};
