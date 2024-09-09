import { Request, Response } from "express"
import Project from "../models/Project"
import Task from "../models/Task"

export class ProjectController{
    
    static getAllProjects=async(req:Request,res:Response)=>{
        try {
            const projects=await Project.find({
                $or:[
                    {manager:{$in:req.user.id}},
                    {team:{$in:req.user.id}}
                ]
            })
            res.json(projects)
        } catch (error) {
            console.log(error.message)
        }
    }

    static createProject=async(req:Request,res:Response)=>{
        const project=new Project(req.body)
        project.manager=req.user.id

        try {
            await project.save()
            res.send('Proyecto Creado Correctamente')
        } catch (error) {
            console.log(error.message)
        }
    }

    static getProjectById=async(req:Request,res:Response)=>{
        try {
            const project=await (await Project.findById(req.params.id)).populate('tasks')
            if(!project) {
                const error = new Error('Proyecto no encontrado')
                return res.status(404).json({error: error.message})
            }
            if (project.manager.toString()!==req.user.id.toString() && !project.team.includes(req.user.id)) {
                const error = new Error('Acción no válida')
                return res.status(401).json({error: error.message})
            }
            res.json(project)
        } catch (error) {
            console.log(error.message)
        }
    }

    static updateProject=async (req:Request,res:Response)=>{
        try {
            const project=await Project.findByIdAndUpdate(req.params.id,req.body)
            if(!project) {
                const error = new Error('Proyecto no encontrado')
                return res.status(404).json({error: error.message})
            }
            if (project.manager.toString()!==req.user.id.toString()) {
                const error = new Error('Solo el Manager puede actualizar un Proyecto')
                return res.status(401).json({error: error.message})
            }
            await project.save()
            res.send("Proyecto Actualizado")
        } catch (error) {
            console.log(error.message)
        }
    }

    static deleteProject=async (req:Request,res:Response)=>{
        try {
            const project=await Project.findById(req.params.id)
            if(!project) {
                const error = new Error('Proyecto no encontrado')
                return res.status(404).json({error: error.message})
            }
            if (project.manager.toString()!==req.user.id.toString()) {
                const error = new Error('Solo el Manager puede eliminar un Proyecto')
                return res.status(401).json({error: error.message})
            }
            await project.deleteOne()
            res.send("Proyecto Eliminado")
        } catch (error) {
            console.log(error.message)
        }
    }
}