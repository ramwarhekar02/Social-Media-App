const express = require('express');
const app = express();
const cookieParser = require("cookie-parser");
const userModel = require("./models/user");
const postModel = require("./models/post");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const upload = require("./config/multerconfig");
const path = require("path");
require('dotenv').config();


app.set("view engine", 'ejs');
app.set("views", path.join(__dirname, "views"));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")));

const mongoose = require('mongoose');
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(err => console.error("MongoDB connection error:", err));

// Routes
app.get("/", (req, res) => {
    res.render("index");
});

app.get("/profile/upload", isLoggedIn, (req, res) => {
    res.render("profileupload");
});

app.post("/upload", isLoggedIn, upload.single("image"), async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        user.profilepic = req.file.filename;
        await user.save();
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error uploading profile picture");
    }
});

app.get("/profile", isLoggedIn, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email }).populate("posts");
        res.render("profile", { user });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading profile");
    }
});

app.post("/post", isLoggedIn, async (req, res) => {
    try {
        let user = await userModel.findOne({ email: req.user.email });
        let { content } = req.body;

        let post = await postModel.create({
            user: user._id,
            content,
        });

        user.posts.push(post._id);
        await user.save();
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating post");
    }
});

app.get("/edit/:id", isLoggedIn, async (req, res) => {
    try {
        let post = await postModel.findOne({ _id: req.params.id }).populate("user");
        res.render("edit", { post });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error loading edit page");
    }
});

app.post("/update/:id", isLoggedIn, async (req, res) => {
    try {
        await postModel.findOneAndUpdate({ _id: req.params.id }, { content: req.body.content });
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error updating post");
    }
});

app.get("/like/:id", isLoggedIn, async (req, res) => {
    try {
        let post = await postModel.findOne({ _id: req.params.id }).populate("user");
        if (post.likes.indexOf(req.user.userid) === -1) {
            post.likes.push(req.user.userid);
        } else {
            post.likes.splice(post.likes.indexOf(req.user.userid), 1);
        }

        await post.save();
        res.redirect("/profile");
    } catch (err) {
        console.error(err);
        res.status(500).send("Error liking post");
    }
});

app.post("/register", async (req, res) => {
    try {
        let { email, username, name, password, age } = req.body;

        let user = await userModel.findOne({ email });
        if (user) return res.status(400).redirect("/login");

        bcrypt.genSalt(10, (err, salt) => {
            if (err) return res.status(500).send("Error generating salt");

            bcrypt.hash(password, salt, async (err, hash) => {
                if (err) return res.status(500).send("Error hashing password");

                let newUser = await userModel.create({
                    username,
                    email,
                    age,
                    name,
                    password: hash,
                });

                let token = jwt.sign({ email: email, userid: newUser._id }, process.env.JWT_SECRET);
                res.cookie("token", token);
                res.redirect("/login");
            });
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error registering user");
    }
});

app.post("/login", async (req, res) => {
    try {
        let { email, password } = req.body;

        let user = await userModel.findOne({ email });
        if (!user) return res.status(400).send("Invalid email or password");

        bcrypt.compare(password, user.password, (err, result) => {
            if (result === true) {
                let token = jwt.sign({ email: email, userid: user._id }, process.env.JWT_SECRET);
                res.cookie("token", token);
                res.status(200).redirect("/profile");
            } else {
                res.status(400).send("Invalid email or password");
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).send("Error logging in");
    }
});

app.get("/register", (req, res) => {
    res.render("index");
});

app.get("/login", (req, res) => {
    res.render("login");
});

app.get("/logout", (req, res) => {
    res.cookie("token", "");
    res.redirect("/login");
});


function isLoggedIn(req, res, next) {
    if (!req.cookies.token) {
        res.redirect("/login");
    } else {
        jwt.verify(req.cookies.token, process.env.JWT_SECRET, (err, data) => {
            if (err) {
                res.redirect("/login");
            } else {
                req.user = data;
                next();
            }
        });
    }
}


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});