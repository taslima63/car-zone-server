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

function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    console.log(authHeader, "authHeader");
    if (!authHeader) {
        res.status(401).send({ message: 'Unauthorized access!' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'Forbidden Access' });
        }
        req.decoded = decoded;
        next();
    });
}

async function run() {
    try {
        await client.connect();
        const partsCollection = client.db('car-zone').collection('carParts');
        const orderCollection = client.db('car-zone').collection('orders');
        const userCollection = client.db('car-zone').collection('users');
        const reviewCollection = client.db('car-zone').collection('reviews');


        const verifyAdmin = async (req, res, next) => {
            const requester = req.decoded.email;
            const requesterAccount = await userCollection.findOne({ email: requester });
            if (requesterAccount.role === 'admin') {
                next();
            }
            else {
                res.status(403).send({ message: 'forbidden' });
            }
        }


        app.get('/carParts', async (req, res) => {
            const query = {};
            const cursor = partsCollection.find(query)
            const parts = await cursor.toArray();
            res.send(parts);
        });
        // add products or parts to carParts document

        app.post('/carParts', async (req, res) => {
            const carParts = req.body;
            const result = await partsCollection.insertOne(carParts);
            res.send(result);
        });

        app.get('/user', async (req, res) => {
            const users = await userCollection.find().toArray();
            res.send(users);
        });

        app.put('/user/:email', async (req, res) => {
            const email = req.params.email;
            const user = req.body;
            const filter = { email: email };
            const options = { upsert: true };
            const updateDoc = {
                $set: user,
            };
            const result = await userCollection.updateOne(filter, updateDoc, options);
            const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '240h' });
            res.send({ result, token });
        });

        app.get('/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const user = await userCollection.findOne({ email: email });
            const isAdmin = user.role === 'admin';
            res.send({ admin: isAdmin })
        })


        app.put('/user/admin/:email', verifyJWT, async (req, res) => {
            const email = req.params.email;
            const filter = { email: email };
            const updateDoc = {
                $set: { role: 'admin' },
            };
            const result = await userCollection.updateOne(filter, updateDoc);
            res.send(result);
        })

        app.get('/available/:id', verifyJWT, async (req, res) => {
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


        app.get('/order', async (req, res) => {
            const myOrder = req.query.myOrder;
            const decodedEmail = req.decoded.email;
            if (myOrder === decodedEmail) {
                const query = { myOrder: myOrder };
                const orders = await orderCollection.find(query).toArray();
                return res.send(orders);
            }
            else {
                return res.status(403).send({ message: 'forbidden access' });
            }
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
        // get reviews
        app.get('/reviews', async (req, res) => {
            const query = {};
            const cursor = reviewCollection.find(query)
            const reviews = await cursor.toArray();
            res.send(reviews);
        });

        // add review to review document
        app.post('/reviews', async (req, res) => {
            const reviews = req.body;
            const result = await reviewCollection.insertOne(reviews);
            res.send(result);
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