import type {Request,Response} from "express"
import User from "../models/User"
import { checkPassword, hashPassword } from "../utils/auth"
import Token from "../models/Token"
import { generateToken } from "../utils/token"
import { AuthEmail } from "../emails/AuthEmail"
import { generateJWT } from "../utils/jwt"

export class AuthController{

    static createAccount=async(req:Request,res:Response)=>{
        try {
            const {password,email}=req.body

            const userExists=await User.findOne({email})
            if(userExists){
                const error=new Error('El Usuario ya está registrado')
                return res.status(409).json({error:error.message})
            }

            const user=new User(req.body)

            //Hash Password
            user.password=await hashPassword(password)

            //Token
            const token=new Token()
            token.token=generateToken()
            token.user=user.id

            //Save
            await Promise.allSettled([user.save(),token.save()])

            //Send mail
            AuthEmail.sendConfirmationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            res.send("Cuenta creada, revisa tu email para confirmarla")

        } catch (error) {
            res.status(500).json({error:"Hubo un error"})
        }
    }

    static confirmAccount=async(req:Request,res:Response)=>{
        try {
            const { token } = req.body

            const tokenExists = await Token.findOne({ token })
            if (!tokenExists) {
                const error = new Error('Token no válido')
                return res.status(404).json({ error: error.message })
            }

            const user = await User.findById(tokenExists.user)
            user.confirmed = true

            await Promise.allSettled([user.save(), tokenExists.deleteOne()])
            res.send('Cuenta confirmada correctamente')
        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static login=async(req:Request,res:Response)=>{
        try {
            const { email, password } = req.body
            const user = await User.findOne({ email })
            if (!user) {
                const error = new Error('Usuario no encontrado')
                return res.status(404).json({ error: error.message })
            }

            if (!user.confirmed) {
                const token = new Token()
                token.user = user.id
                token.token = generateToken()
                await token.save()

                // enviar el email
                AuthEmail.sendConfirmationEmail({
                    email: user.email,
                    name: user.name,
                    token: token.token
                })

                const error = new Error('La cuenta no ha sido confirmada, hemos enviado un e-mail de confirmación')
                return res.status(401).json({ error: error.message })
            }

            // Revisar password
            const isPasswordCorrect = await checkPassword(password, user.password)
            if(!isPasswordCorrect) {
                const error = new Error('Password Incorrecto')
                return res.status(401).json({ error: error.message })
            }

            const token = generateJWT({id: user.id})

            res.send(token)

        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }

        
    }

    static requestConfirmationCode=async(req:Request,res:Response)=>{
        try {
            const {email}=req.body

            const user=await User.findOne({email})
            if(!user){
                const error=new Error('El Usuario no está registrado')
                return res.status(409).json({error:error.message})
            }

            if(user.confirmed){
                const error=new Error('El Usuario ya está confirmado')
                return res.status(403).json({error:error.message})
            }

            const token=new Token()
            token.token=generateToken()
            token.user=user.id

            await Promise.allSettled([user.save(),token.save()])

            AuthEmail.sendConfirmationEmail({
                email: user.email,
                name: user.name,
                token: token.token
            })

            res.send("Se envió un nuevo token a tu e-mail")

        } catch (error) {
            res.status(500).json({error:"Hubo un error"})
        }
    }

    static forgotPassword=async(req:Request,res:Response)=>{
        try {
            const {email}=req.body

            const user=await User.findOne({email})
            if(!user){
                const error=new Error('El Usuario no está registrado')
                return res.status(409).json({error:error.message})
            }

            const token=new Token()
            token.token=generateToken()
            token.user=user.id
            await token.save()

            AuthEmail.sendPasswordResetToken({
                email: user.email,
                name: user.name,
                token: token.token
            })

            res.send("Revisa tu e-mail para instrucciones")

        } catch (error) {
            res.status(500).json({error:"Hubo un error"})
        }
    }

    static validateToken=async(req:Request,res:Response)=>{
        try {
            const { token } = req.body

            const tokenExists = await Token.findOne({ token })
            if (!tokenExists) {
                const error = new Error('Token no válido')
                return res.status(404).json({ error: error.message })
            }
            res.send('Token válido, define tu nuevo password')
        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static updatePasswordWithToken=async(req:Request,res:Response)=>{
        try {
            const { token } = req.params

            const tokenExists = await Token.findOne({ token })
            if (!tokenExists) {
                const error = new Error('Token no válido')
                return res.status(404).json({ error: error.message })
            }

            const user=await User.findById(tokenExists.user)
            user.password=await hashPassword(req.body.password)

            await Promise.allSettled([user.save(),tokenExists.deleteOne()])

            res.send('La contraseña se modificó correctamente')
        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static user=async(req:Request,res:Response)=>{
        return res.json(req.user)
    }

    static updateProfile=async(req:Request,res:Response)=>{
        const {name,email}=req.body
        req.user.name=name
        req.user.email=email
        try {
            const userExists=await User.findOne({email})
            if (userExists && userExists.id.toString()!==req.user.id.toString()) {
                res.status(409).json({ error: new Error("Ese email ya está registrado").message })
            }

            await req.user.save()
            res.send('El perfil se ha actualizado correctamente')
        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static updateCurrentUserPassword=async(req:Request,res:Response)=>{
        const {current_password,password}=req.body
        const user=await User.findById(req.user.id)
        const isPasswordCorrect=await checkPassword(current_password,user.password)
        if (!isPasswordCorrect) {
            res.status(401).json({ error: new Error("El Password actual es incorrecto").message })
        }
 
        try {
            user.password=await hashPassword(password)
            await user.save()
            res.send("Password actualizado correctamente")
        } catch (error) {
            res.status(500).json({ error: 'Hubo un error' })
        }
    }

    static checkPassword = async (req: Request, res: Response) => {
        const { password } = req.body

        const user = await User.findById(req.user.id)

        const isPasswordCorrect = await checkPassword(password, user.password)
        if(!isPasswordCorrect) {
            const error = new Error('El Password es incorrecto')
            return res.status(401).json({error: error.message})
        }

        res.send('Password Correcto')
    }
}