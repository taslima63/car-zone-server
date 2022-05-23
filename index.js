const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://carUserAdmin:KfdjEwlecLUCZq4Z@cluster0.idcgr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });



async function run() {
    try {
        await client.connect();
        const partsCollection = client.db('car-zone').collection('carParts');
        const orderCollection = client.db('car-zone').collection('orders');
        const userCollection = client.db('car-zone').collection('users');


        app.get('/carParts', async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query)
            const parts = await cursor.toArray();
            res.send(parts);
        });

        app.post('/carParts', async (req, res) => {
            const carParts = req.body;
            const result = await partsCollection.insertOne(carParts);
            res.send(result);
        });

        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });


        app.get('/available/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const query = { _id: ObjectId(id) };
            const parts = await partsCollection.find(query).toArray();
            const orders = await orderCollection.find().toArray();
            parts.forEach(part => {
                const partsOrdered = orders.filter(order => order.name === part.name);
                const availableQuantity = parseInt(part.available);
                const orderedQuantity = parseInt(partsOrdered.order_quantity);
                console.log("orderedQuantity", orderedQuantity);
                console.log("availableQuantity", availableQuantity);
                const available = availableQuantity - partsOrdered?.quantity;
                parts.available = parseInt(available);
            });
            res.send(parts);
        })



        app.post('/order', async (req, res) => {
            const order = req.body;
            const query = { name: order.name, unit_price: order.unit_price, order_quantity: order.order_quantity, userId: order.userId, user: order.user, userName: order.userName };
            const exists = await orderCollection.findOne(query);
            if (exists) {
                return res.send({ success: false, order: exists })
            }
            const result = await orderCollection.insertOne(order);
            return res.send({ success: true, result });
        });




    } finally {

    }
}

run().catch(console.dir);



app.get('/', (req, res) => {
    res.send('Hello from carZone!');
})

app.listen(port, () => {
    console.log(`carzone app listening on port ${port}`);
})