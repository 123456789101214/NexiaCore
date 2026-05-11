import mongoose from 'mongoose'; // 1. require වෙනුවට import
import colors from 'colors';   // console colors පාවිච්චි කරනවා නම්

const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI);
        
        // MongoDB connect වුණාම වැටෙන මැසේජ් එක
        console.log(`MongoDB Connected: ${conn.connection.host}`.cyan.underline);
    } catch (error) {
        console.error(`Error: ${error.message}`.red.bold);
        process.exit(1);
    }
};

// 2. module.exports වෙනුවට export default
export default connectDB;