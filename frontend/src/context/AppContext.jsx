import axios from "axios";
import { createContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export const AppContext = createContext()


const AppContextProvider = (props) => {
    const [user,setUser] = useState(null)
    const [ showLogin,setShowLogin ] = useState(false)
    const [ token,setToken ] = useState(localStorage.getItem('token'))

    const [ credit,setCredit ] = useState(false)


    const backendUrl = import.meta.env.VITE_BACKEND_URL

    const navigate = useNavigate();

    const loadCreditsData = async () => {
        try {
            const { data } = await axios.get(backendUrl + "/api/user/credits", {
                headers: { token },
            });
    
            if (data.success) {
                console.log("✅ Full User Data from API:", data.user);
    
                if (!data.user.id && !data.user._id) {
                    console.error("❌ User ID is missing in API response:", data.user);
                    toast.error("User ID is missing! Please re-login.");
                    return;
                }
    
                setCredit(data.credits);
                setUser({
                    id: data.user.id || data.user._id, // Ensure ID is set
                    name: data.user.name,
                    email: data.user.email,
                });
            }
        } catch (error) {
            console.log(error);
            toast.error(error.message);
        }
    };
    const generateImage = async(prompt) =>{
        try {
            const {data} = await axios.post(backendUrl + '/api/image/generate-image',{prompt},{headers:{token}})

            if(data.success) {
                loadCreditsData()
                return data.resultImage
            }
            else {
                toast.error(data.message)
                loadCreditsData()
                if(data.creditBalance === 0) {
                    navigate('/buy')
                }
            }
        } catch (error) {
            toast.error(error.message)
        }
    }

    const logout = () => {
        localStorage.removeItem('token')
        setToken('')
        setUser(null)
    }

    useEffect(() => {
        if(token) {
            loadCreditsData()
        }
    },[token])

    const value = {
        user,setUser,showLogin,setShowLogin,backendUrl,token,setToken,credit,setCredit,loadCreditsData,
        logout,generateImage
    }
    
    return (
        <AppContext.Provider value={value}>
            {props.children}
        </AppContext.Provider>
    )
}


export default AppContextProvider