const express = require('express');
const cors = require('cors');
const app = express();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(cors({origin: 'https://manufacturer-website-87c0c.web.app'}));
app.use(express.json());

// user and pass
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.09lai.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri);

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


function verifyJwt(req,res, next){
    const authHeader = req.headers.authorization;
    if(!authHeader){
        return res.status(401).send({message: 'unAuthorized access'})
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCES_TOKEN_SECRET, function(err,decoded){
        if(err){
            return res.status(403).send({message: 'Forbidden access'})
        }
        req.decoded = decoded;
        next();
    })
    
}

async function run() {
    try {
      await client.connect();
      console.log('db connected')
      const manufacturerCollection = client.db("manufacturer").collection("products");
      const orderCollection = client.db("manufacturer").collection("order");
      const reviewCollection = client.db("manufacturer").collection("review");
      const userCollection = client.db("manufacturer").collection("user");
      const paymentCollection = client.db("manufacturer").collection("payment");
      const profileCollection = client.db("manufacturer").collection("profile");


      app.get('/product', async(req,res) =>{
          const query = {};
          const cursor = manufacturerCollection.find(query);
          const products= await cursor.toArray()
          res.send(products)
      });

      app.get('/user', verifyJwt, async(req,res)=>{
          const users = await userCollection.find().toArray()
          res.send(users)
      });

      app.get('/myprofile/:email', async(req,res) =>{
          const email = req.params.email;
          const user = await profileCollection.findOne({email: email});
          res.send(user)
      })

      app.get('/admin/:email', async(req,res) =>{
          const email = req.params.email;
          const user = await userCollection.findOne({email: email});
          const isAdmin = user.role === 'admin';
          res.send({admin: isAdmin})
      })

      app.get('/order/:id', verifyJwt, async(req,res) =>{
          const id = req.params.id;
          const query = {_id: ObjectId(id)};
          const order = await orderCollection.findOne(query);
          res.send(order)
      })

      app.put('/user/admin/:email', verifyJwt, async(req,res) =>{
        const email = req.params.email;
        const requesting = req.decoded.email;
        const requestingAccount = await userCollection.findOne({email: requesting});
        console.log(requestingAccount)
        if(requestingAccount.role === 'admin'){
            const filter ={ email: email };
        const updateDoc = {
            $set: {role: 'admin'},
        };
        const result = await userCollection.updateOne(filter, updateDoc);
        res.send(result);

        }
        else{
            res.status(403).send({message: 'forbidden'})
        }

    })

      app.put('/user/:email', async(req,res) =>{
          const email = req.params.email;
          const user = req.body;
          const filter ={ email: email };
          const options = { upsert: true };
          const updateDoc = {
              $set: user,
          };
          const result = await userCollection.updateOne(filter, updateDoc, options);
          const token = jwt.sign({email: email}, process.env.ACCES_TOKEN_SECRET)
          res.send({result, token});

      })

      app.get('/product/:id', async(req,res) =>{
          const id = req.params.id
          const query = {_id: ObjectId(id)};
          const cursor = manufacturerCollection.find(query);
          const sigleProduct = await cursor.toArray();
          res.send(sigleProduct)
      });

     app.post('/order/:id', async(req,res) =>{
         const order = req.body;
         const result = await orderCollection.insertOne(order);
         res.send(result);
     });

     app.post('/review/:id', async(req,res) =>{
         const review = req.body;
         const result = await reviewCollection.insertOne(review);
         res.send(result)
     });

     app.post('/addproduct', async(req, res) =>{
         const newproduct = req.body;
         const result = await manufacturerCollection.insertOne(newproduct);
         res.send(result)

     });

     app.post('/myprofile', async (req, res) => {
        const newUser = req.body;
        const result = await profileCollection.insertOne(newUser);
        res.send(result);
    });
   
    app.post('/create-payment-intent', verifyJwt, async(req,res) =>{
        const service = req.body;
        const prize = service.totalPrize;
        const amount = prize*100;
        const paymentIntent = await stripe.paymentIntents.create({
            amount: amount,
            currency: 'usd',
            payment_method_types:['card']
        })
        res.send({clientSecret: paymentIntent.client_secret})
    })


     app.get('/manageproduct', async (req, res) => {
            const query = {};
            const cursor = manufacturerCollection.find(query);
            const manageorder = await cursor.toArray();
            res.send(manageorder);
    })

     app.get('/review', async(req,res) =>{
         const query = {};
         const cursor = reviewCollection.find(query);
         const result = await cursor.toArray();
         res.send(result)

     })

     app.get('/order', verifyJwt,  async(req,res) =>{
         const email = req.query.customerEmail;
         const decodedEmail = req.decoded.email;
         if(email === decodedEmail){
            const query = {customerEmail: email};
            const order = await orderCollection.find(query).toArray();
             res.send(order);
         }
         else{
             return res.status(403).send({message: 'forbidden access'})
         }
        
     });

     app.get('/allorder', async(req,res) =>{
       const order = await orderCollection.find().toArray();
        res.send(order);
    });


    app.patch('/order/:id', verifyJwt, async(req,res) =>{
        const id = req.params.id;
        const payment = req.body;
        const filter = {_id: ObjectId(id)};
        const updateDoc = {
            $set: {
                paid: true,
                transactionId: payment.transactionId
            }
        }

        const updatedOrder = await orderCollection.updateOne(filter,updateDoc);
        const result = await paymentCollection.insertOne(payment);
        res.send(updatedOrder)

    })

     app.delete('/order/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await orderCollection.deleteOne(query);
        res.send(result);

    });

    app.delete('/product/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await manufacturerCollection.deleteOne(query);
        res.send(result);

    });

    }
    finally{

    }
}
run().catch(console.dir);

app.get('/', (req,res) =>{
    res.send('Manufacturer website mehedi')
});

app.listen(port, () =>{
    console.log(`this is port ${port}`)
})

