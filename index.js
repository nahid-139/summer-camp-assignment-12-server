const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.krpkhzs.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {

  try {
   client.connect();
    const dataCollection = client.db("SummerCampDB").collection("allData");
    const usersCollection = client.db("SummerCampDB").collection("users");
    const selectClassCollection = client.db("SummerCampDB").collection("selectClass");
    const addClassCollection = client.db("SummerCampDB").collection("addClass");


    app.get("/allData", async (req, res) => {
      const toy= dataCollection.find();
      const result = await toy.toArray();
      res.send(result);
    });

    // users

    app.get('/users',  async (req, res) => {
      const result = await usersCollection.find().toArray();
      res.send(result);
    });

    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const existingUser = await usersCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user already exists' })
      }
      const result = await usersCollection.insertOne(user);
      res.send(result);
    });

// admin role
app.patch("/users/admin/:id", async (req, res) => {
  const id = req.params.id;
  const filter = { _id: ObjectId(id) };
  const options = { upsert: true };
  const updatedDoc = {
    $set: {
      role: "admin",
    },
  };
  const result = await usersCollection.updateOne(
    filter,
    updatedDoc,
    options
  );
  res.send(result);
});

 

app.delete("/users/:id", async (req, res) => {
  const id = req.params.id;
  const query = { _id: ObjectId(id) };
  const result = await usersCollection.deleteOne(query);
  res.send(result);
});


    //  My Classes

    app.get('/class',  async (req, res) => {
      const email = req.query.email;
      if (!email) {
        res.send([]);
      }
      const query = { email: email };
      const result = await selectClassCollection.find(query).toArray();
      res.send(result);
    });


    app.post('/class', async (req, res) => {
      const item = req.body;
      const result = await selectClassCollection.insertOne(item);
      res.send(result);
    });

// My class delete
    app.delete('/class/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await selectClassCollection.deleteOne(query);
      res.send(result);
    })

// Instractor class 
    app.get("/addclass", async (req, res) => {
      const toy= addClassCollection.find();
      const result = await toy.toArray();
      res.send(result);
    });
  
  
    app.post("/addclass", async(req, res) => {
      const items = req.body;
      const cursor= await addClassCollection.insertOne(items)
      res.send(cursor)
    });


    app.get("/insclass/", async (req, res) => {
      let query ={};
      if(req.query?.email){
        query ={email :req.query?.email}
      }
      const result =await addClassCollection.find(query).toArray();
      res.send(result);
    });

    // Payment
    app.post('/create-payment-intent', async (req, res) => {
      const { price } = req.body;
      const amount = parseInt(price * 100);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });

      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    app.post('/payments', async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentCollection.insertOne(payment);

      const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } }
      const deleteResult = await selectClassCollection.deleteMany(query)

      res.send({ insertResult, deleteResult });
    })
    
  } finally {
    // Ensures that the client will close when you finish/error
    await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('Summer is running')
  })
  
  app.listen(port, () => {
    console.log(`Summer School is running on port ${port}`);
  })
  