import React, { useContext } from 'react';
import { assets, plans } from '../assets/assets';
import { AppContext } from '../context/AppContext';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-toastify';

const BuyCredit = () => {
  const { user, backendUrl, loadCreditsData, token, setShowLogin } = useContext(AppContext);
  const navigate = useNavigate();

  const initPay = async (order) => {
    // Razorpay options
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID, // Ensure this is loaded correctly
      amount: order.amount,
      currency: order.currency,
      name: "Credits Payment",
      description: "Credits Payment",
      order_id: order.id,
      receipt: order.receipt,
      handler: async (response) => {
        try {
          const {data} = await axios.post(backendUrl + '/api/user/verify-razor',response,{headers:{token}})

          if(data.success) {
            loadCreditsData()
            navigate('/')
            toast.success('Credit Added')
          }
        } catch (error) {
          toast.error(error.message)
        }
      },
    };

    console.log("Razorpay Options:", options); // Debugging log

    // Open Razorpay checkout
    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  const paymentRazorpay = async (planId) => {
    try {
        if (!user) {
            setShowLogin(true);
            return;
        }

        console.log("✅ User Object from Context:", user); // Debugging log
        const userId = user.id || user._id;

        if (!userId) {
            console.error("❌ User ID is missing from user object:", user);
            toast.error("User ID is missing! Please re-login.");
            return;
        }

        console.log("✅ Plan ID Sent:", planId);
        console.log("✅ User ID Sent:", userId);

        const { data } = await axios.post(
            backendUrl + "/api/user/pay-razor",
            { userId, planId },
            { headers: { "Content-Type": "application/json", token } }
        );

        console.log("✅ API Response:", data);

        if (data.success) {
            initPay(data.order);
        } else {
            toast.error("Payment initiation failed!");
        }
    } catch (error) {
        console.error("❌ Payment Error:", error.response?.data);
        toast.error(error.response?.data?.message || "Something went wrong!");
    }
};


  

  return (
    <motion.div
      initial={{ opacity: 0.2, y: 100 }}
      transition={{ duration: 1 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="min-h-[80vh] text-center pt-14 mb-10"
    >
      <button className="border border-gray-400 px-10 py-2 rounded-full mb-6">Our Plans</button>

      <h1 className="text-center text-3xl font-medium mb-6 sm:mb-10">Choose the plan</h1>

      <div className="flex flex-wrap justify-center gap-6 text-left">
        {plans.map((item, index) => (
          <div
            key={index}
            className="bg-white drop-shadow-sm rounded-lg py-12 px-8 text-gray-600 hover:scale-105 transition-all duration-500"
          >
            <img width={40} src={assets.logo_icon} alt="" />
            <p className="mt-3 mb-1 font-semibold">{item.id}</p>
            <p className="text-sm">{item.desc}</p>
            <p className="mt-6">
              <span className="text-3xl font-medium">₹{item.price} </span>/ {item.credits} credits
            </p>

            <button
              onClick={() => paymentRazorpay(item.id)}
              className="w-full bg-gray-800 text-white mt-8 text-sm rounded-md py-2.5 min-w-52 cursor-pointer"
            >
              {user ? 'Purchase' : 'Get Started'}
            </button>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default BuyCredit;
