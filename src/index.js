import dotenv from "dotenv"
import connectDB from "./db/index.js"
import { app } from "./app.js"
import { port } from "./constants.js"
dotenv.config({ path: "./.env"})

connectDB()
    .then(() => {
        app.on("error", (error) => {
            console.log("ERRR:", error);
            throw error
        })
        app.listen(port, () => {
            console.log(`Server Listening at port ${process.env.PORT}`);
        })
    })
    .catch((error) => {
        console.error("MONGODB Connection Error: ", error);
    })