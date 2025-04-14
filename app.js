const express = require('express')
const app = express(); 
const cookieParser = require("cookie-parser")
const userModel = require("./models/user");
const postModel = require("./models/post");
const bcrypt = require('bcrypt');
const jwt = require("jsonwebtoken");
const upload = require("./config/multerconfig")
const path = require("path");

app.set("view engine", 'ejs');
app.use(express.json());
app.use(express.urlencoded({extended: true}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, "public")))

app.get("/", (req, res)=> { 
    res.render("index");
})

app.get("/profile/upload", (req, res)=> { 
    res.render("profileupload");
})

app.post("/upload", isLoggedIn, upload.single("image"), async (req, res)=> {
    let user = await userModel.findOne({email: req.user.email});
    user.profilepic = req.file.filename;
    await user.save();
    res.redirect("/profile");
})


app.get("/profile", isLoggedIn, async (req, res)=> { 
    let user = await userModel.findOne({email: req.user.email}).populate("posts");
    res.render("profile", {user});
})

app.post("/post", isLoggedIn, async (req, res)=> { 
    let user = await userModel.findOne({email: req.user.email});
    let {content} = req.body;

    let post = await postModel.create({ 
        user: user._id,
        content,
    });

    user.posts.push(post._id);
    await user.save();
    res.redirect("/profile");
})

app.get("/edit/:id", isLoggedIn, async (req, res)=> { 
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
    res.render("edit", {post});
})

app.post("/update/:id", isLoggedIn, async (req, res)=> { 
    let post = await postModel.findOneAndUpdate({_id: req.params.id}, {content: req.body.content});
    res.redirect("/profile");
}) 

app.get("/like/:id", isLoggedIn, async (req, res)=> { 
    let post = await postModel.findOne({_id: req.params.id}).populate("user");
    if (post.likes.indexOf(req.user.userid) === -1) { 
        post.likes.push(req.user.userid);
    } else { 
        post.likes.splice(post.likes.indexOf(req.user.userid), 1);
    }

    await post.save();
    res.redirect("/profile");
})

app.post("/register", async (req, res)=> { 
    let { email, username, name , password, age} = req.body;

    let user = await userModel.findOne({email});
    if(user) return res.status(500).redirect("/login");

    bcrypt.genSalt(10, (err, salt) => {
        if (err) return res.status(500).send("Error generating salt");

        bcrypt.hash(password, salt, async (err, hash) => {
            if (err) return res.status(500).send("Error hashing password");

            let user = await userModel.create({
                username,
                email,
                age,
                name,
                password: hash,
            });

            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            res.redirect("/login");
        });
    });
})

app.post("/login", async (req, res)=> { 
    let { email, password} = req.body;

    let user = await userModel.findOne({email});
    if(!user) return res.status(500).send("Something WENT Wrong");

    bcrypt.compare(password, user.password, (err, result) => {
        if(result === true)  { 
            let token = jwt.sign({ email: email, userid: user._id }, "shhhh");
            res.cookie("token", token);
            res.status(200).redirect("/profile");
        } else { 
            res.render("/profile");
        }
    })
})

app.get("/register", (req, res)=> { 
    res.render("index");
})

app.get("/login", (req, res)=> { 
    res.render("login");
})

app.get("/logout", (req, res)=> { 
    res.cookie("token", "");
    res.redirect("/login")
})

function isLoggedIn(req, res, next){
    if(!req.cookies.token) {
        res.redirect("/login");
    } else { 
        jwt.verify(req.cookies.token, "shhhh", (err, data) => {
            if (err) {
                res.redirect("/login");
            } else {
                req.user = data;
                next();
            }
        });
    }
}

app.listen(3000);