const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;


// middleware
app.use(cors());
app.use(express.json());



const {
    MongoClient,
    ServerApiVersion,
    ObjectId
} = require('mongodb');



const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ealpifc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

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
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();


        const userCollection = client.db('weddingMatrimony').collection('users');
        const bioDataCollection = client.db('weddingMatrimony').collection('biodatas');
        const storyCollection = client.db('weddingMatrimony').collection('stories');

        app.get('/users', async (req, res) => {
            const result = await userCollection.find().toArray();
            res.send(result);
        })

        app.get('/users/:email', async (req, res) => {
            const email = req.params.email;
            const query = {
                email: email
            };
            const user = await userCollection.findOne(query);
            res.send(user);
        })

        app.post('/users', async (req, res) => {
            const user = req.body;

            // checking user existency
            const query = {
                email: user.email
            }
            const existingUser = await userCollection.findOne(query);
            if (existingUser) {
                return res.send({
                    message: 'User already exists',
                    insertedId: null
                })
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })


        // biodata related api
        app.get('/biodatas', async (req, res) => {
            const result = await bioDataCollection.find().toArray();
            res.send(result);
        })

        app.get('/biodatas/:id', async (req, res) => {
            const id = req.params.id;
            console.log("bus", id);
            const query = {
                userId: id
            }
            const result = await bioDataCollection.findOne(query);
            res.send(result);
        });


        app.post('/biodatas', async (req, res) => {
            const bioData = req.body;
            const userId = bioData.userId;

            const query = {
                userId: bioData.userId
            }
            const existingUser = await bioDataCollection.findOne(query);
            // console.log(existingUser)
            if (!existingUser) {
                const lastBiodata = await bioDataCollection.find({}).sort({
                    biodataId: -1
                }).limit(1).toArray();

                let biodataId = 1; // Default value if no documents exist
                if (lastBiodata.length > 0) {
                    biodataId = lastBiodata[0].biodataId + 1;
                }

                const newDocument = {
                    ...bioData,
                    biodataId
                };
                const result = await bioDataCollection.insertOne(newDocument);
                res.send(result);
            } else {
                const updateResult = await bioDataCollection.updateOne({
                    userId: userId
                }, {
                    $set: bioData
                })
                res.send(updateResult);
            }

        })






        // stories related api
        app.post('/stories', async (req, res) => {
            const story = req.body;
            // checking user existency
            const query = {
                userEmail: story.userEmail
            }
            const existingUser = await storyCollection.findOne(query);
            if (existingUser) {
                return res.send({
                    message: 'Story already exists',
                    insertedId: null
                })
            }
            const result = await storyCollection.insertOne(story);
            res.send(result);

        })



        // Send a ping to confirm a successful connection
        await client.db("admin").command({
            ping: 1
        });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.get('/', (req, res) => {
    res.send('wedding is running');
})

app.listen(port, () => {
    console.log('Weeding is running in Narayanganj');
})