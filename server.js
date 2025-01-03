
const express = require("express");
const app = express();
const passport = require("passport");
const session = require("express-session");
const mongoose = require("mongoose");
const User = require("./models/userModel");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const path = require("path");
const nocache = require("nocache");
const uploadMiddleware = require("./middleware/uploadMiddleware");


require('dotenv').config();

app.set("view engine", "ejs");
app.use(express.static("public"));
require("./models/mongodb");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));   



app.use(nocache());

app.use(
  session({
    secret: "your_secret_key", // Change to a secure key in production
    resave: false, // Avoid resaving sessions unnecessarily
    saveUninitialized: false, // Don't create sessions until something is stored
    cookie: {
      maxAge: 604800000, // 7 days in milliseconds
      secure: false, // Set to true in HTTPS (production)
      httpOnly: true, // Prevent client-side JavaScript access
    },
  })
);


const getCartAndWishlistQuantity = require("./middleware/cartAndWishlistIconQtyMiddleware");
app.use(getCartAndWishlistQuantity);



// server.js
app.use((req, res, next) => {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
  next();
});




// const navbarUsername = require("../middleware/navbarUsername");

const navbarUsername = require("./middleware/navbarUsername");

app.use(navbarUsername);


const userRoute = require("./routes/userRoute");
app.use("/", userRoute);
 
const adminRoute = require("./routes/adminRoute");
app.use("/admin", adminRoute);

 

app.use(express.json());   
app.use(express.urlencoded({ extended: true }));

// --------------Google Login---------------------------
app.use(express.static(path.join(__dirname, "public")));

app.use(passport.initialize());
app.use(passport.session());  

// callbackURL: "http://localhost:3000/auth/google/callback",

passport.use( 
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.CallbackURI,
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value });

        console.log("google user details " +user)
        if (user) {
          if (user.status === "blocked") {
            return done(null, false, {
              message: `${profile.emails[0].value} is blocked`,
            });
            // return res.render("user/userLogin", {
            // error: `${user.email} is blocked`,
            // });

          }

           
          user.googleId = profile.id;
        } else {
          user = new User({
            googleId: profile.id,
            fullName: profile.displayName,
            email: profile.emails[0].value,
          });
        }
 
        await user.save();
        return done(null, user);
      } catch (err) {
        return done(err, null);
      }
    }
  )
);

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser((id, done) => {
  User.findById(id)
    .then((user) => done(null, user))
    .catch((err) => done(err, null));
});




app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
    prompt: "select_account",
  })
);


app.get("/auth/google/callback", (req, res, next) => {
  passport.authenticate("google", (err, user, info) => {
    if (err) {
      return res.status(500).render("user/userLogin", {
        error: "An error occurred during authentication.",
      });
    }

    if (!user && info && info.message) {
      // Display the block message
      return res.render("user/userLogin", { error: info.message });
    }

    // Successful login
    req.logIn(user, (err) => {
      if (err) {
        return res.status(500).render("user/userLogin", {
          error: "Failed to log in the user.",
        });
      }

      // Update the session with the user data
      req.session.user = user;
      res.redirect("/");
    });
  })(req, res, next);
});



// app.get("/logout", (req, res) => {
//   req.logout(() => {
//     res.redirect("/");
//   });
// });



// Search API
app.get('/search', (req, res) => {
  const query = req.query.query?.toLowerCase();
  if (!query) {
    return res.json([]);
  }

  // Filter products based on query
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(query)
  );

  res.json(filteredProducts);
});







const PORT = process.env.PORT||3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

