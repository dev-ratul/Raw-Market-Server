const express = require('express')
const app = express()
const port = process.env.PORT || 3000
const cors = require('cors')
var admin = require("firebase-admin");

require("dotenv").config();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

// Middleware
app.use(cors());
app.use(express.json());





var serviceAccount = require("./firebase-admin-key.json");

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});





const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();


const uri = `mongodb+srv://${process.env.USER_NAME}:${process.env.USER_PASSWORD}@cluster0.dakbubs.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;


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


    const db = client.db('rawMarket')
    const usersCollection = db.collection('users')
    const productsCollection = db.collection('products')
    const advertisementCollection = db.collection('advertisement')
    const watchlistCollection = db.collection('watchList')
    const reviewCollection = db.collection('review')
    const paymentCollection = db.collection('payments')
    const AdminOffersCollection = db.collection('adminOffer')



    // custume middleware
    const verifyFbToken = async (req, res, next) => {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
      }
      const token = authHeader.split(' ')[1]
      if (!token) {
        return res.status(401).send({ message: 'unauthorized access' })
      }

      // verify token
      try {
        const decoded = await admin.auth().verifyIdToken(token)
        req.decoded = decoded;
        next()
      } catch {
        res.status(403).send({ message: 'forbidden access' })
      }
    }

    const verifyAdmitToken = async (req, res, next) => {
      const email = req.decoded.email

      const quary = { email }
      const user = await usersCollection.findOne(quary)

      if (!user || user.role !== 'admin') {
        return res.status(403).send({ message: 'forbided access' })
      }

      next();
    }



    // upload users
    app.post('/users', async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user)
      res.send(result)
    })

    // Get user by email - check if user exists
    app.get('/users/:email', async (req, res) => {
      const email = req.params.email;
      const user = await usersCollection.findOne({ email });
      res.send(user); // যদি না পায়, null পাঠাবে
    });

    // Update user info (like last_at)
    app.patch('/users/:email', async (req, res) => {
      const email = req.params.email;
      const updateData = req.body;

      try {
        const result = await usersCollection.updateOne(
          { email: email },
          { $set: updateData }
        );
        if (result.matchedCount === 0) {
          return res.status(404).send({ message: "User not found" });
        }
        res.send({ message: "User updated successfully" });
      } catch (error) {
        console.error("Error updating user:", error);
        res.status(500).send({ error: "Failed to update user" });
      }
    });




    // ✅ Upload products with latest price at the beginning
    app.post('/products', async (req, res) => {
      try {
        const newProduct = req.body;
        const { itemName, date, pricePerUnit } = newProduct;

        // ✅ parse current price entry
        const currentPrice = {
          date,
          price: Number(pricePerUnit),
        };

        // ✅ check if same itemName already exists
        const previousProducts = await productsCollection
          .find({ itemName })
          .toArray();

        // ✅ collect all previous prices
        const allPrices = previousProducts.flatMap(product => product.prices || []);

        // ✅ add new price at the beginning of array
        allPrices.unshift(currentPrice);

        // ✅ update prices array in the new product
        newProduct.prices = allPrices;

        const result = await productsCollection.insertOne(newProduct);
        res.send(result);
      } catch (error) {
        console.error('❌ Error inserting product:', error);
        res.status(500).send({ error: 'Internal Server Error' });
      }
    });

    app.get("/HomeProducts/all-approved", async (req, res) => {
      const limit = parseInt(req.query.limit) || 6;
      const approvedProducts = await productsCollection
        .find({ status: "approved" })
        .sort({ date: -1 })
        .limit(limit)
        .toArray();
      res.send(approvedProducts);
    });


    app.get("/products/potata",verifyFbToken, async (req, res) => {
      try {
        const pipeline = [
          {
            $match: {
              status: "approved",
              itemName: "Potata"  // ✅ Potata এর ডেটা শুধু
            },
          },
          {
            $addFields: {
              pricesLength: { $size: "$prices" },
            },
          },
          {
            $sort: {
              pricesLength: -1,
              date: -1,
            },
          },
          { $limit: 1 },
          {
            $project: {
              prices: 1,
              itemName: 1,
              marketName: 1,
              date: 1,
              vendorName: 1,
              pricesLength: 1
            },
          },
        ];

        const top = await productsCollection.aggregate(pipeline).toArray();

        if (top.length > 0) {
          res.send(top[0].prices.reverse()); // ✅ latest to oldest
        } else {
          res.status(404).send({ message: "No Potata data found." });
        }

      } catch (error) {
        console.error("Error fetching Potata data:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });






    // 📁 onion/productRoutes.js বা main server ফাইলে যুক্ত করো
    app.get("/products/onion", verifyFbToken, async (req, res) => {
      try {
        const pipeline = [
          {
            $match: {
              status: "approved",
              itemName: "Onion"  // ✅ Potata এর ডেটা শুধু
            },
          },
          {
            $addFields: {
              pricesLength: { $size: "$prices" },
            },
          },
          {
            $sort: {
              pricesLength: -1,
              date: -1,
            },
          },
          { $limit: 1 },
          {
            $project: {
              prices: 1,
              itemName: 1,
              marketName: 1,
              date: 1,
              vendorName: 1,
              pricesLength: 1
            },
          },
        ];

        const top = await productsCollection.aggregate(pipeline).toArray();

        if (top.length > 0) {
          res.send(top[0].prices.reverse()); // ✅ latest to oldest
        } else {
          res.status(404).send({ message: "No Potata data found." });
        }

      } catch (error) {
        console.error("Error fetching Potata data:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });
    // 📁 orka/productRoutes.js বা main server ফাইলে যুক্ত করো
    app.get("/products/orka", verifyFbToken, async (req, res) => {
      try {
        const pipeline = [
          {
            $match: {
              status: "approved",
              itemName: "Orka"
            },
          },
          {
            $addFields: {
              pricesLength: { $size: "$prices" },
            },
          },
          {
            $sort: {
              pricesLength: -1,
              date: -1,
            },
          },
          { $limit: 1 },
          {
            $project: {
              prices: 1,
              itemName: 1,
              marketName: 1,
              date: 1,
              vendorName: 1,
              pricesLength: 1
            },
          },
        ];

        const top = await productsCollection.aggregate(pipeline).toArray();

        if (top.length > 0) {
          res.send(top[0].prices.reverse()); // ✅ latest to oldest
        } else {
          res.status(404).send({ message: "No Potata data found." });
        }

      } catch (error) {
        console.error("Error fetching Potata data:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });




    app.get("/products/potata-full", verifyFbToken, async (req, res) => {
      try {
        const pipeline = [
          {
            $match: {
              status: "approved",
              itemName: "Potata", // ✅ Potata এর ডেটা ফিল্টার
            },
          },
          {
            $addFields: {
              pricesLength: { $size: "$prices" },
            },
          },
          {
            $sort: {
              pricesLength: -1,
              date: -1,
            },
          },
          { $limit: 1 }, // ✅ সবথেকে বড় prices array যুক্ত document
        ];

        const result = await productsCollection.aggregate(pipeline).toArray();

        if (result.length > 0) {
          // ✅ Optional: prices কে latest-to-oldest করছিস এখানে
          result[0].prices = result[0].prices.reverse();
          res.send(result[0]); // ✅ পুরো document পাঠানো হচ্ছে
        } else {
          res.status(404).send({ message: "No Potata data found." });
        }

      } catch (error) {
        console.error("Error fetching full Potata data:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });
    app.get("/products/Tomato-full", verifyFbToken, async (req, res) => {
      try {
        const pipeline = [
          {
            $match: {
              status: "approved",
              itemName: "Tomato", // ✅ Potata এর ডেটা ফিল্টার
            },
          },
          {
            $addFields: {
              pricesLength: { $size: "$prices" },
            },
          },
          {
            $sort: {
              pricesLength: -1,
              date: -1,
            },
          },
          { $limit: 1 }, // ✅ সবথেকে বড় prices array যুক্ত document
        ];

        const result = await productsCollection.aggregate(pipeline).toArray();

        if (result.length > 0) {
          // ✅ Optional: prices কে latest-to-oldest করছিস এখানে
          result[0].prices = result[0].prices.reverse();
          res.send(result[0]); // ✅ পুরো document পাঠানো হচ্ছে
        } else {
          res.status(404).send({ message: "No Potata data found." });
        }

      } catch (error) {
        console.error("Error fetching full Potata data:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });
    // orka all data
    app.get("/products/orka-full", verifyFbToken,  async (req, res) => {
      try {
        const pipeline = [
          {
            $match: {
              status: "approved",
              itemName: "Orka", // ✅ Potata এর ডেটা ফিল্টার
            },
          },
          {
            $addFields: {
              pricesLength: { $size: "$prices" },
            },
          },
          {
            $sort: {
              pricesLength: -1,
              date: -1,
            },
          },
          { $limit: 1 }, // ✅ সবথেকে বড় prices array যুক্ত document
        ];

        const result = await productsCollection.aggregate(pipeline).toArray();

        if (result.length > 0) {
          // ✅ Optional: prices কে latest-to-oldest করছিস এখানে
          result[0].prices = result[0].prices.reverse();
          res.send(result[0]); // ✅ পুরো document পাঠানো হচ্ছে
        } else {
          res.status(404).send({ message: "No Potata data found." });
        }

      } catch (error) {
        console.error("Error fetching full Potata data:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });
    // onion all data
    app.get("/products/onion-full", verifyFbToken, async (req, res) => {
      try {
        const pipeline = [
          {
            $match: {
              status: "approved",
              itemName: "Onion", // ✅ Potata এর ডেটা ফিল্টার
            },
          },
          {
            $addFields: {
              pricesLength: { $size: "$prices" },
            },
          },
          {
            $sort: {
              pricesLength: -1,
              date: -1,
            },
          },
          { $limit: 1 }, // ✅ সবথেকে বড় prices array যুক্ত document
        ];

        const result = await productsCollection.aggregate(pipeline).toArray();

        if (result.length > 0) {
          // ✅ Optional: prices কে latest-to-oldest করছিস এখানে
          result[0].prices = result[0].prices.reverse();
          res.send(result[0]); // ✅ পুরো document পাঠানো হচ্ছে
        } else {
          res.status(404).send({ message: "No Potata data found." });
        }

      } catch (error) {
        console.error("Error fetching full Potata data:", error);
        res.status(500).send({ error: "Internal server error" });
      }
    });










    // my-product
    app.get("/my-product", verifyFbToken, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }

      try {
        const result = await productsCollection
          .find({ vendorEmail: email })
          .sort({ date: -1 })  // date অনুসারে DESCENDING
          .toArray();

        res.send(result);

      } catch (err) {
        res.status(500).send({ message: "Failed to get user products", error: err.message });
      }
    });

    // get update my-product
    const { ObjectId } = require("mongodb");

    app.get('/my-product/:id', async (req, res) => {
      const id = req.params.id;

      try {
        const result = await productsCollection.findOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        console.error("❌ Error fetching product:", error);
        res.status(500).send({ message: "Failed to fetch product" });
      }
    });

    // 
    // Update Product API
    app.patch('/update-product/:id', async (req, res) => {
      const id = req.params.id;
      const updatedProduct = req.body;

      try {
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: updatedProduct }
        );
        res.send(result);
      } catch (err) {
        res.status(500).send({ message: "Failed to update product" });
      }
    });

    // delete product


    app.delete('/delete-product/:id', async (req, res) => {
      const id = req.params.id;
      try {
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result); // result = { deletedCount: 1 }
      } catch (error) {
        console.error(error);
        res.status(500).send({ error: "Failed to delete product" });
      }
    });




    // upload Advertisement
    app.post('/advertisement', async (req, res) => {
      const data = req.body
      const result = await advertisementCollection.insertOne(data)
      res.send(result)
    })

    // ✅ Get All Advertisements
    app.get('/advertisement', async (req, res) => {
      const result = await advertisementCollection.find().toArray();
      res.send(result);
    });


    // get my-advertisement
    app.get('/my-advertisement', verifyFbToken, async (req, res) => {
      const email = req.query.email;

      if (!email) {
        return res.status(400).send({ message: "Email is required" });
      }

      try {
        const result = await advertisementCollection
          .find({ vendorEmail: email })
          .toArray();

        res.send(result);

      } catch (err) {
        res.status(500).send({ message: "Failed to get user products", error: err.message });
      }
    })

    // update advertisement
    app.patch('/advertisement/:id', async (req, res) => {
      const id = req.params.id;
      const updated = req.body;

      const result = await advertisementCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: updated }
      );

      res.send(result);
    });

    // delet advertisement
    app.delete('/advertisement/:id', async (req, res) => {
      const id = req.params.id;
      const result = await advertisementCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });

    // get all-users
    // ✅ Unified GET /all-users route (with optional search)
    app.get("/all-users", verifyFbToken, async (req, res) => {
      try {
        const { search } = req.query;
        const filter = {};

        if (search) {
          const regex = new RegExp(search, "i"); // case-insensitive
          filter.$or = [{ name: regex }, { email: regex }];
        }

        const users = await usersCollection.find(filter).toArray();
        res.send(users);
      } catch (err) {
        res.status(500).send({ error: "Failed to fetch users" });
      }
    });





    // Example route inside your Express.js backend
    app.patch("/update-role/:id", verifyFbToken, verifyAdmitToken, async (req, res) => {
      const id = req.params.id;
      const { role } = req.body;

      try {
        const result = await usersCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { role: role } }
        );

        res.send(result);
      } catch (err) {
        res.status(500).send({ error: "Failed to update role" });
      }
    });




    // 🔹 Get all products
    app.get("/admin/products", verifyFbToken, verifyAdmitToken, async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const total = await productsCollection.countDocuments();
        const products = await productsCollection
          .find()
          .skip(skip)
          .limit(limit)
          .toArray();

        res.send({ total, products });
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
      }
    });

    // 🔸 Reject a product with reason
    app.patch("/products/reject/:id", async (req, res) => {
      const { id } = req.params;
      const { reason, feedback } = req.body;
      console.log(feedback)

      const result = await productsCollection.updateOne(
        { _id: new ObjectId(id) },
        {
          $set: {
            status: "rejected",
            rejectionReason: reason,
            rejectionFeedback: feedback,
          },
        }
      );

      res.send(result);
    });




    // 🔹 Approve product
    app.patch("/products/approve/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "approved" } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Approve failed", error });
      }
    });

    // 🔹 Reject product
    app.patch("/products/reject/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await productsCollection.updateOne(
          { _id: new ObjectId(id) },
          { $set: { status: "rejected" } }
        );
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Reject failed", error });
      }
    });

    // 🔹 Delete product
    app.delete("/products/:id", async (req, res) => {
      const { id } = req.params;
      try {
        const result = await productsCollection.deleteOne({ _id: new ObjectId(id) });
        res.send(result);
      } catch (error) {
        res.status(500).send({ message: "Delete failed", error });
      }
    });




    // GET all advertisements
    app.get("/advertisements", verifyFbToken, verifyAdmitToken, async (req, res) => {
      const result = await advertisementCollection.find().toArray();
      res.send(result);
    });

    // PATCH status change
    app.patch("/advertisements/status/:id", async (req, res) => {
      const id = req.params.id;
      const { status } = req.body;
      const result = await advertisementCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status } }
      );
      res.send(result);
    });

    // DELETE advertisement
    app.delete("/advertisements/:id", async (req, res) => {
      const id = req.params.id;
      const result = await advertisementCollection.deleteOne({ _id: new ObjectId(id) });
      res.send(result);
    });





    app.get("/products/all-approved", async (req, res) => {
      try {
        const { sort, from, to, page = 1, limit = 6 } = req.query;
        console.log("From:", from, "To:", to);

        const filter = { status: "approved" };

        // ✅ তারিখ অনুযায়ী ফিল্টারিং (String based)
        if (from && to) {
          filter.date = {
            $gte: from,
            $lte: to,
          };
        }

        // ✅ Sort Options
        const sortOptions = {};
        if (sort === "asc") sortOptions.pricePerUnit = 1;
        else if (sort === "desc") sortOptions.pricePerUnit = -1;

        // ✅ Pagination
        const skip = (parseInt(page) - 1) * parseInt(limit);
        const total = await productsCollection.countDocuments(filter);

        const products = await productsCollection
          .find(filter)
          .sort(sortOptions)
          .skip(skip)
          .limit(parseInt(limit))
          .toArray();

        res.send({ products, total });
      } catch (error) {
        console.error("Error fetching products:", error);
        res.status(500).json({ error: "Failed to fetch products" });
      }
    });




    // ✅ Route to get product by ID
    app.get('/products/:id', verifyFbToken, async (req, res) => {
      const id = req.params.id;

      try {
        const result = await productsCollection.findOne({ _id: new ObjectId(id) });

        if (!result) {
          return res.status(404).json({ message: 'Product not found' });
        }

        res.send(result);
      } catch (error) {
        res.status(500).json({ message: 'Server error', error });
      }
    });


    // starrt
    // Save to watchlist
    app.post("/watchlist", async (req, res) => {
      const item = req.body; // contains productId, userEmail, date
      const alreadyExists = await watchlistCollection.findOne({
        productId: item.productId,
        userEmail: item.userEmail,
      });
      if (alreadyExists) return res.send({ message: "already_added" });
      const result = await watchlistCollection.insertOne(item);
      res.send(result);
    });

    // getWatchList
    app.get('/my-watch-list', verifyFbToken, async (req, res) => {
      const email = req.query.email;

      try {
        const watchlistItems = await watchlistCollection.find({ email: email }).toArray();
        console.log("Watchlist Items:", watchlistItems);

        if (!watchlistItems.length) return res.send([]);

        const productIds = watchlistItems.map(item => new ObjectId(item.productId));
        console.log("Converted Product IDs:", productIds);

        const products = await productsCollection.find({ _id: { $in: productIds } }).toArray();
        console.log("Fetched Products:", products);

        res.send(products);
      } catch (err) {
        console.error(err);
        res.status(500).send({ message: "Something went wrong" });
      }
    });

    app.delete('/watchlist/remove', async (req, res) => {
      const { email, productId } = req.query;

      try {
        const result = await watchlistCollection.deleteOne({
          email: email,
          productId: productId,
        });

        if (result.deletedCount === 1) {
          res.send({ success: true });
        } else {
          res.status(404).send({ message: "Not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).send({ message: "Something went wrong" });
      }
    });




    // Save user review
    app.post("/reviews", async (req, res) => {
      const review = req.body; // { productId, rating, comment, userEmail, userName, date }
      const result = await reviewCollection.insertOne(review);
      res.send(result);
    });


    // Get all reviews for a product
    app.get("/reviews/:productId", async (req, res) => {
      const productId = req.params.productId;
      const result = await reviewCollection.find({ productId }).toArray();
      res.send(result);
    });


    // Get all approved prices for same item across dates
    app.get("/price-history/:itemName", async (req, res) => {
      const { itemName } = req.params;
      const { start, end } = req.query;
      const filter = {
        itemName,
        status: "approved",
        date: {
          $gte: new Date(start),
          $lte: new Date(end),
        },
      };
      const result = await productsCollection.find(filter).toArray();
      res.send(result);
    });

    // ✅ get product by ID
    app.get('/product/:id', async (req, res) => {
      const id = req.params.id;

      try {
        const query = { _id: new ObjectId(id) };
        const result = await productsCollection.findOne(query);

        if (!result) {
          return res.status(404).json({ message: "Product not found" });
        }

        res.json(result);
      } catch (err) {
        res.status(500).json({ message: "Invalid ID format", error: err.message });
      }
    });

    // payment
    app.post('/create-payment-intent', async (req, res) => {
      try {
        const { amount } = req.body;
        console.log(amount)

        const paymentIntent = await stripe.paymentIntents.create({
          amount,
          currency: 'usd',
          automatic_payment_methods: {
            enabled: true,
          },
        });

        res.json({ clientSecret: paymentIntent.client_secret });
      } catch (error) {
        res.status(500).json({ error: error.message });
      }
    });

    // ✅ 1. After payment success: update payment status & store history
    app.post('/confirm-payment', async (req, res) => {
      try {
        const { productId, transactionId, email, amount, paymentMethod, marketName, productName } = req.body;

        // Save payment history
        const paymentEntry = {
          productId: productId,
          transactionId: transactionId,
          email: email,
          amount: amount,
          marketName,
          paymentMethod: paymentMethod,
          productName,
          paid_at_string: new Date().toISOString(),
          paid_at: new Date(),
        }

        const insertResult = await paymentCollection.insertOne(paymentEntry);

        res.send({
          message: "Payment confirmed and history saved",
          insertResult,
        });

      } catch (err) {
        res.status(500).send({ message: "Failed to confirm payment", error: err.message });
      }
    });

    // get payment history
    // ✅ GET route for fetching payment history
    app.get('/payment-history', verifyFbToken, async (req, res) => {
      try {
        const email = req.query.email;
        console.log("Backend Email Received: ", email);

        if (!email) {
          return res.status(400).send({ message: "Email query param is required" });
        }

        const query = { email: email };
        const result = await paymentCollection.find(query).toArray();

        res.send(result);
      } catch (err) {
        res.status(500).send({
          message: "Failed to fetch payment history",
          error: err.message,
        });
      }
    });
    // ✅ GET route for fetching payment history
    app.get('/all-payment-history', verifyFbToken, verifyAdmitToken, async (req, res) => {
      try {

        const result = await paymentCollection.find().toArray();

        res.send(result);
      } catch (err) {
        res.status(500).send({
          message: "Failed to fetch payment history",
          error: err.message,
        });
      }
    });


    app.get('/users/role/:email', async (req, res) => {
      const email = req.params.email;

      if (!email) {
        return res.status(400).send({ success: false, message: "Email is required" })
      }

      try {
        const user = await usersCollection.findOne(
          { email: email },
          { projection: { role: 1 } } // শুধু role return করবো
        );

        if (!user) {
          return res.status(404).send({ success: false, message: "User not found" })
        }

        res.send({ success: true, role: user.role || "user" });
      } catch (error) {
        res.status(500).send({ success: false, message: error.message });
      }
    });




    app.get("/price-trend/:id", async (req, res) => {
      const productId = req.params.id;
      const compareDate = req.query.date; // format: 'YYYY-MM-DD'
      console.log(productId, compareDate)

      if (!compareDate) {
        return res.status(400).send({ error: "Date query param is required" });
      }

      try {
        // Step 1: Find product by ID
        const originalProduct = await productsCollection.findOne({
          _id: new ObjectId(productId),
        });

        if (!originalProduct) {
          return res.status(404).send({ error: "Original product not found" });
        }

        const itemName = originalProduct.itemName;

        // Step 2: Find product by itemName and date
        const matchedProduct = await productsCollection.findOne({
          itemName: itemName,
          date: compareDate, // This assumes date is stored as a string like '2025-07-22'
        });
        console.log(matchedProduct)

        if (!matchedProduct) {
          return res.status(404).send({ error: "No product found for given date and itemName" });
        }

        // Step 3: Return prices array
        const pricesArray = matchedProduct.prices || [];

        res.send(pricesArray);
      } catch (error) {
        console.error("Error fetching price trend:", error);
        res.status(500).send({ error: "Server error" });
      }
    });


    app.post('/admin-offers', async (req, res) => {
      const offer = req.body;
      offer.createdAt = new Date();

      const result = await AdminOffersCollection.insertOne(offer);
      res.send(result);
    });

    app.get('/special-offer', async (req, res) => {
      try {
        const offers = await AdminOffersCollection.find().toArray();
        res.send(offers);
      } catch (err) {
        res.status(500).send({ error: 'অফার লোড করতে ব্যর্থ হয়েছে।' });
      }
    });


    app.get('/home-special-offer', async (req, res) => {
      try {
        const offers = await AdminOffersCollection.find()
          .sort({ _id: -1 }) 
          .limit(6)
          .toArray();

        res.send(offers);
      } catch (err) {
        res.status(500).send({ error: 'Failed to load offers.' });
      }
    });















    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);


app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
