const express = require("express");
const cors = require("cors");
require("dotenv").config();
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const app = express();
const port = process.env.PORT || 5000;

// middlewares
const whitelist = [
  "http://localhost:3000",
  "https://shelter-guru-final.web.app",
];
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin || whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
};
app.use(cors());
app.use(express.json());

// Decode JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    console.log(decoded);
    req.decoded = decoded;
    next();
  });
}

// Database Connection
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@dbuser1.oi3ncct.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

async function run() {
  try {
    const homesCollection = client.db("shelterGuruDb").collection("homes");
    const usersCollection = client.db("shelterGuruDb").collection("users");
    const bookingsCollection = client
      .db("shelterGuruDb")
      .collection("bookings");

    //save user email & generate jwt
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      console.log(result);

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      console.log(token);
      res.send({ result, token });
    });

    // Get a single user by email
    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    // Get all users
    app.get("/users", verifyJWT, async (req, res) => {
      const users = await usersCollection.find().toArray();
      console.log(users);
      res.send(users);
    });

    // Get All Homes
    app.get("/homes", async (req, res) => {
      const query = {};
      const cursor = homesCollection.find(query);
      const homes = await cursor.toArray();
      res.send(homes);
    });

    // Get All Homes for host
    app.get("/homes/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        "host.email": email,
      };
      const cursor = homesCollection.find(query);
      const homes = await cursor.toArray();
      res.send(homes);
    });

    // Get Single Home
    app.get("/home/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const home = await homesCollection.findOne(query);
      res.send(home);
    });

    // Delete a home
    app.delete("/home/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await homesCollection.deleteOne(query);
      res.send(result);
    });

    // Update A Home
    app.put("/homes", verifyJWT, async (req, res) => {
      const home = req.body;
      console.log(home);

      const filter = {};
      const options = { upsert: true };
      const updateDoc = {
        $set: home,
      };
      const result = await homesCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // Post A Home
    app.post("/homes", verifyJWT, async (req, res) => {
      const home = req.body;
      console.log(home);
      const result = await homesCollection.insertOne(home);
      res.send(result);
    });
    // Save a booking
    app.post("/bookings", verifyJWT, async (req, res) => {
      const booking = req.body;
      console.log(booking);
      const result = await bookingsCollection.insertOne(booking);

      console.log("result----->", result);
      sendMail(
        {
          subject: "Booking Successful!",
          message: `Booking Id: ${result?.insertedId}, TransactionId: ${booking.transactionId}`,
        },
        booking?.guestEmail
      );
      res.send(result);
    });

    // Get All Bookings
    app.get("/bookings", verifyJWT, async (req, res) => {
      let query = {};
      const email = req.query.email;
      if (email) {
        query = {
          guestEmail: email,
        };
      }

      const cursor = bookingsCollection.find(query);
      const bookings = await cursor.toArray();
      res.send(bookings);
    });

    // Get a single booking
    app.get("/booking/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const booking = await bookingsCollection.findOne(query);
      res.send(booking);
    });
    // Add a home
    app.post("/homes", async (req, res) => {
      const homes = req.body;
      const result = await homesCollection.insertOne(homes);
      console.log(result);
      res.send(result);
    });
    //
    console.log("Database Connected...");
  } finally {
  }
}

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("Server is running...");
});

app.listen(port, () => {
  console.log(`Server is running...on ${port}`);
});
