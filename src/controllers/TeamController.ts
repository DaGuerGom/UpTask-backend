import {Request,Response} from "express"
import User from "../models/User"
import Project from "../models/Project"

export class TeamMemberController{

    static getProjectTeam=async(req:Request,res:Response)=>{
        const project=await Project.findById(req.project.id).populate({
            path:"team",
            select:"id email name"
        })
        res.json(project.team)
    }

    static findMemberByEmail=async(req:Request,res:Response)=>{
        const {email}=req.body

        const user=await User.findOne({email}).select("id email name")
        if (!user) {
            return res.status(404).json({error:new Error('Usuario no encontrado').message})
        }
        res.json(user)
    }

    static addMember=async(req:Request,res:Response)=>{
        const {id}=req.body
        const user=await User.findById(id).select("id")
        if (!user) {
            return res.status(404).json({error:new Error('Usuario no encontrado').message})
        }
        if (req.project.team.some(team=>team.toString()===user.id.toString())) {
            return res.status(409).json({error:new Error('El usuario ya existe en el proyecto').message})
        }
        if (req.project.manager.toString()===user.id.toString()) {
            return res.status(409).json({error:new Error('No puedes agregar al manager al proyecto').message})
        }

        req.project.team.push(user.id)
        await req.project.save()
        res.send("Usuario agregado correctamente")
    }

    static removeMember=async(req:Request,res:Response)=>{
        const {userId}=req.params
        if (!req.project.team.some(team=>team.toString()===userId)) {
            return res.status(409).json({error:new Error('El usuario no existe en el proyecto').message})
        }

        req.project.team=req.project.team.filter(teamMember=>teamMember.toString()!==userId)

        await req.project.save()

        res.send("Usuario eliminado correctamente")
    }
}