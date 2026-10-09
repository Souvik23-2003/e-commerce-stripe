require("dotenv").config();

const express = require("express");
const cors = require("cors");
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const app = express();


// ==============================
// MIDDLEWARE
// ==============================

app.use(cors());
app.use(express.json());
app.use(express.static("."));


// ==============================
// CHECK STRIPE SECRET KEY
// ==============================

if (
    !process.env.STRIPE_SECRET_KEY ||
    !process.env.STRIPE_SECRET_KEY.startsWith("sk_")
) {

    console.error(
        "Stripe secret key is missing or invalid."
    );

    console.error(
        "Make sure STRIPE_SECRET_KEY is set in your .env file."
    );

    process.exit(1);
}


console.log(
    "Stripe initialized successfully."
);


// ==============================
// STRIPE CONFIG
// ==============================

app.get("/config", (req, res) => {

    res.json({
        publishableKey:
            process.env.STRIPE_PUBLISHABLE_KEY || null
    });

});


// ==============================
// CREATE CHECKOUT SESSION
// ==============================

app.post(
    "/create-checkout-session",
    async (req, res) => {

        try {

            const cartItems =
                req.body.cart;


            if (
                !Array.isArray(cartItems) ||
                cartItems.length === 0
            ) {

                return res.status(400).json({
                    error:
                        "Cart is empty or invalid."
                });
            }


            const lineItems =
                cartItems.map(item => ({

                    price_data: {

                        currency: "inr",

                        product_data: {

                            name: item.title,

                            images: [
                                item.image
                            ]

                        },

                        unit_amount:
                            Math.round(
                                Number(item.price) * 100
                            )

                    },

                    quantity:
                        Number(item.quantity)

                }));


            const session =
                await stripe.checkout.sessions.create({

                    payment_method_types: [
                        "card"
                    ],

                    line_items:
                        lineItems,

                    mode:
                        "payment",

                    success_url:
                        `${req.headers.origin}/success.html`,

                    cancel_url:
                        `${req.headers.origin}/cart.html`

                });


            res.json({
                id: session.id
            });


        } catch (error) {

            console.error(
                "[ROUTE ERROR]",
                error.message
            );


            res.status(500).json({
                error:
                    error.message
            });

        }
    }
);


// ==============================
// START SERVER
// ==============================

const PORT = 3000;


app.listen(
    PORT,
    () => {

        console.log("____");

        console.log(
            `[SUCCESS] Server is running continuously on http://localhost:${PORT}`
        );

        console.log("____");

    }
);