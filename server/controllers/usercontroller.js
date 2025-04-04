import userModel from '../models/user.model.js'
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'
import Razorpay from 'razorpay'
import transactionModel from '../models/transactionModel.js'

const registerUser = async (req, res) => {
    try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
            return res.status(400).json({
                success: false,
                message: "Missing Details"
            });
        }

        if (password.length < 8) {
            return res.status(400).json({
                success: false,
                message: "Password must be at least 8 characters long"
            });
        }

        const existingUser = await userModel.findOne({ email });
        if (existingUser) {
            return res.status(400).json({
                success: false,
                message: "Email is already registered"
            });
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        const userData = {
            name,
            email,
            password: hashedPassword
        };

        const newUser = new userModel(userData);
        const user = await newUser.save();

        if (!process.env.JWT_SECRET) {
            throw new Error("JWT_SECRET is not defined in environment variables");
        }

        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });

        res.status(201).json({
            success: true,
            token,
            user: {
                name: user.name
            }
        });

    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
};

const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await userModel.findOne({ email });

        if (!user) {
            return res.json({
                success: false,
                message: "Email is required"
            });
        }
        
        const isMatch = await bcrypt.compare(password, user.password);

        if (isMatch) {
            const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);

            res.json({
                success: true,
                token,
                user: {
                    name: user.name
                }
            });
        } else {
            return res.json({
                success: false,
                message: 'Invalid credentials'
            });
        }

    } catch (error) {
        console.log(error);
        res.json({
            success: false,
            message: error.message
        });
    }
};

const userCredits = async (req, res) => {
    try {
        const { id: userId } = req.user || {}; // ✅ Extract userId correctly

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: "User ID is missing from request",
            });
        }

        const user = await userModel.findById(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        return res.json({ // ✅ Include user ID in response
            success: true,
            credits: user.creditBalance,
            user: { 
                id: user._id,  // ✅ Added user ID 
                name: user.name 
            },
        });

    } catch (error) {
        console.error("Error in userCredits:", error);
        return res.status(500).json({
            success: false,
            message: "Internal Server Error",
        });
    }
};

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  
  const paymentRazorpay = async (req, res) => {
    try {
        
      const { userId, planId } = req.body;
  
      // Validate inputs
      if (!userId || !planId) {
        return res.status(400).json({ success: false, message: "Missing Details" });
      }
  
      console.log("Received Data:", { userId, planId }); // Debugging
  
      // Check if user exists
      const userData = await userModel.findById(userId);
      if (!userData) {
        return res.status(404).json({ success: false, message: "User not found" });
      }
  
      let credits, plan, amount;
  
      switch (planId) {
        case "Basic":
          plan = "Basic";
          credits = 100;
          amount = 10;
          break;
  
        case "Advanced":
          plan = "Advanced";
          credits = 500;
          amount = 50;
          break;
  
        case "Business":
          plan = "Business";
          credits = 5000;
          amount = 250;
          break;
  
        default:
          return res.status(400).json({ success: false, message: "Invalid Plan" });
      }
  
      // Create a new transaction
      const newTransaction = await transactionModel.create({
        userId,
        plan,
        amount,
        credits,
        date: Date.now(),
      });
  
      // Razorpay order options
      const options = {
        amount: amount * 100, // Convert to paisa
        currency: "INR",
        receipt: newTransaction._id.toString(),
      };
  
      // Create order
      razorpayInstance.orders.create(options, (error, order) => {
        if (error) {
          console.error("Razorpay Order Error:", error);
          return res.status(500).json({ success: false, message: error.message });
        }
        res.json({ success: true, order });
      });
    } catch (error) {
      console.error("Server Error:", error);
      res.status(500).json({ success: false, message: error.message });
    }
  };


  const verifyRazorpay = async (req,res) => {
    try {
        const { razorpay_order_id }  = req.body

        const orderInfo = await razorpayInstance.orders.fetch(razorpay_order_id)

        if(orderInfo.status === 'paid') {
            const transactionData = await transactionModel.findById(orderInfo.receipt)
            if(!transactionData.payment) {
                return res.json({
                    success:false,
                    message: "Payment Failed"
                })
            }

            const userData = await userModel.findById(transactionData.userId)

            const creditBalance = userData.creditBalance + transactionData.credits

            await userModel.findByIdAndUpdate(userData._id, {creditBalance})

            await transactionModel.findByIdAndUpdate(transactionData._id,{payment:true})

            res.json({
                success:true,
                message:"Credits Added"
            })
        }
        else {
            res.json({
                success:false,
                message:"Message Failed"
            })
        }
    } catch (error) {
        console.log(error)
        res.json({
            success:false,
            message:error.message
        })
    }
  }
  
export { registerUser, loginUser, userCredits,paymentRazorpay,verifyRazorpay };