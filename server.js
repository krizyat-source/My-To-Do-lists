
const express = require("express");
const cors = require("cors");
const connectDB = require("./config/database");
const taskRoutes = require("./routes/taskRoutes");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// API Routes
app.use("/api/tasks", taskRoutes);

// Home route
app.get("/", (req, res) => {
    res.send("MyTodo API is running!");
});

// Start server
const startServer = async () => {
    try {
        await connectDB();

        app.listen(process.env.PORT || 5000, () => {
            console.log(`Server running on port ${process.env.PORT || 5000}`);
        });
    } catch (error) {
        console.error("Server failed to start:", error.message);
    }
};

startServer();
