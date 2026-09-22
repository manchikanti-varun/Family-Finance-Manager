import 'dotenv/config'; import mongoose from 'mongoose'; import { app } from './app.js';
const port=Number(process.env.PORT||4000); const uri=process.env.MONGODB_URI;
if(uri) await mongoose.connect(uri); else console.warn('MONGODB_URI is not set; API is running without a database connection.');
app.listen(port,()=>console.log(`Finance API listening on :${port}`));
