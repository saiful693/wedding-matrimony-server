const express = require('express');
const app = express();
const cors = require('cors');
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
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
        const checkoutCollection = client.db('weddingMatrimony').collection('checkout');
        const contactCollection = client.db('weddingMatrimony').collection('contact');
        const premiumCollection = client.db('weddingMatrimony').collection('premium');
        const favouriteCollection = client.db('weddingMatrimony').collection('favourites');

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

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });


        app.patch('/users/premium/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            };
            const updatedDoc = {
                $set: {
                    isPremium: true,
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });



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
            const {
                ageFrom,
                ageTo,
                biodataType,
                permanentDivision,
                ids
            } = req.query;


            const filter = {};

            if (ageFrom) {
                filter.age = {
                    $gte: ageFrom
                };
            }

            if (ageTo) {
                filter.age = filter.age ? {
                    ...filter.age,
                    $lte: ageTo
                } : {
                    $lte: ageTo
                };
            }

            if (biodataType) {
                filter.biodataType = biodataType;
            }


            if (permanentDivision) {
                filter.permanentDivision = permanentDivision;
            }

            if (ids) {
                const idsArray = ids.split(',').map(id => new ObjectId(id.trim()));
                filter._id = {
                    $in: idsArray
                };
            }
            const result = await bioDataCollection.find(filter).toArray();
            res.send(result);
        })


        app.get('/biodatas/category/:category', async (req, res) => {
            const category = req.params.category;
            const query = {
                biodataType: category
            };

            const result = await bioDataCollection.find(query).limit(3).toArray();
            console.log(result)
            res.send(result);
        })


        app.get('/biodatas/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await bioDataCollection.findOne(query);
            res.send(result);
        });

        app.get('/biodatas/checkout/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }
            const result = await bioDataCollection.findOne(query);
            res.send(result);

        });


        app.get('/biodatas/user/:id', async (req, res) => {
            const id = req.params.id;
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


        app.get('/stories', async (req, res) => {
            const result = await storyCollection.find().toArray();
            res.send(result);
        })

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



        // payment intent
        app.post('/create-payment-intent', async (req, res) => {
            const {
                price
            } = req.body;
            const amount = parseInt(price * 100);

            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ['card']
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            })
        })


        // premium related api

        app.get('/premium', async (req, res) => {
            const result = await premiumCollection.find().toArray();
            res.send(result);
        })

        app.post('/premium', async (req, res) => {
            const premiumReq = req.body;
            const result = await premiumCollection.insertOne(premiumReq);
            res.send(result);
        })


        app.delete('/premium/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                bioDataId: id.toString()
            }

            const result = await premiumCollection.deleteOne(query);
            res.send(result);
        })




        // favourites  related api

        app.get('/favourites/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const query = {
                email: email
            };
            const requestData = await favouriteCollection.find(query).toArray();;
            res.send(requestData);
        })

        app.post('/favourites', async (req, res) => {
            const favReq = req.body;
            const result = await favouriteCollection.insertOne(favReq);
            res.send(result);
        })


        app.delete('/favourites/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }

            const result = await favouriteCollection.deleteOne(query);
            res.send(result);
        })


        // contact collection

        app.get('/contact', async (req, res) => {
            const result = await contactCollection.find().toArray();
            res.send(result)
        })

        app.get('/contact/:email', async (req, res) => {
            const email = req.params.email;
            console.log(email)
            const query = {
                email: email
            };
            const requestData = await contactCollection.find(query).toArray();
            res.send(requestData);
        })





        app.post('/contact', async (req, res) => {
            const contact = req.body;
            const contactResult = await contactCollection.insertOne(contact);
            res.send(contactResult)
        })



        app.patch('/contact/:id', async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: new ObjectId(id)
            };
            const updatedDoc = {
                $set: {
                    status: 'Approved'
                }
            }
            const result = await contactCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });


        app.delete('/contact/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: new ObjectId(id)
            }

            const result = await contactCollection.deleteOne(query);
            res.send(result);
        })



        // checkout
        app.get('/checkout', async (req, res) => {
            const totalAmount = await checkoutCollection.aggregate([{
                $group: {
                    _id: null,
                    total: {
                        $sum: "$amount"
                    }
                }
            }]).toArray();
            res.send(totalAmount);
        })


        app.post('/checkout', async (req, res) => {
            const checkout = req.body;
            const checkoutResult = await checkoutCollection.insertOne(checkout);
            res.send(checkoutResult)
        })


        // app.delete('/checkout/:id', async (req, res) => {
        //     const id = req.params.id;
        //     const query = {
        //         _id: new ObjectId(id)
        //     }

        //     const result = await checkoutCollection.deleteOne(query);
        //     res.send(result);
        // })



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