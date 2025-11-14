import { CorsOptions } from 'cors'

export const corsConfig: CorsOptions = {
    origin: function(origin, callback) {
        console.log({origin});
        const whitelist = [process.env.FRONTEND_URL]
        console.log({whitelist})
        if(process.argv[2] === '--api') {
            whitelist.push(undefined)
        }

        if(whitelist.includes(origin)) {
            callback(null, true)
        } else if(origin) {
            callback(new Error('Error de CORS'))
        }
    }
}
