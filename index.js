const express = require('express');
const cors = require('cors')
const app = express();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.09lai.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
      await client.connect();
      console.log('db connected')
      const manufacturerCollection = client.db("manufacturer").collection("products");
      const orderCollection = client.db("manufacturer").collection("order");
      const reviewCollection = client.db("manufacturer").collection("review");

      app.get('/product', async(req,res) =>{
          const query = {};
          const cursor = manufacturerCollection.find(query);
          const products= await cursor.toArray()
          res.send(products)
      });

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

     app.get('/review', async(req,res) =>{
         const query = {};
         const cursor = reviewCollection.find(query);
         const result = await cursor.toArray();
         res.send(result)

     })

     app.get('/order', async(req,res) =>{
        const order = await orderCollection.find().toArray();
         res.send(order);
     });

     app.delete('/order/:id', async (req, res) => {
        const id = req.params.id;
        const query = { _id: ObjectId(id) };
        const result = await orderCollection.deleteOne(query);
        res.send(result);

    });

    }
    finally{

    }
}
run().catch(console.dir);

app.get('/', (req,res) =>{
    res.send('Manufacturer website')
});

app.listen(port, () =>{
    console.log(`this is port ${port}`)
})

