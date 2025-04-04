import express from 'express'
import { generateImage } from '../controllers/imagecontroller.js'
import userAuth from '../middleware/auth.js'


const imageRouter = express.Router()

imageRouter.post('/generate-image',userAuth,generateImage)

export default imageRouter