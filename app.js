document.addEventListener("DOMContentLoaded", async () => {

    const BACKEND_URL = "http://localhost:3000";

    let allProducts = [];
    let stripe = null;

    // ==============================
    // LOCAL STORAGE
    // ==============================

    const getCart = () =>
        JSON.parse(localStorage.getItem("cart")) || [];

    const saveCart = (cart) =>
        localStorage.setItem("cart", JSON.stringify(cart));

    const getOrders = () =>
        JSON.parse(localStorage.getItem("orders")) || [];

    const saveOrders = (orders) =>
        localStorage.setItem("orders", JSON.stringify(orders));


    // ==============================
    // NOTIFICATION
    // ==============================

    function showNotification(message, isError = false) {

        const notification = document.createElement("div");

        notification.className = `
            fixed bottom-5 left-1/2 -translate-x-1/2
            text-white px-4 py-3 rounded-lg shadow-lg
            z-[1000] text-sm
            ${isError ? "bg-red-500" : "bg-green-600"}
        `;

        notification.textContent = message;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.remove();
        }, 4000);
    }


    // ==============================
    // STRIPE INITIALIZATION
    // ==============================

    async function initStripe() {

        try {

            if (!window.Stripe) {

                console.error(
                    "Stripe.js is not loaded. Make sure your HTML contains:"
                );

                console.error(
                    "<script src='https://js.stripe.com/v3/'></script>"
                );

                return null;
            }

            const response = await fetch(`${BACKEND_URL}/config`);

            if (!response.ok) {

                console.error(
                    "Failed to fetch Stripe configuration."
                );

                return null;
            }

            const { publishableKey } = await response.json();

            if (
                !publishableKey ||
                !publishableKey.startsWith("pk_")
            ) {

                console.error(
                    "Invalid Stripe publishable key."
                );

                const checkoutButton =
                    document.getElementById("checkout-button");

                if (checkoutButton) {
                    checkoutButton.disabled = true;
                }

                showNotification(
                    "Payment is temporarily unavailable.",
                    true
                );

                return null;
            }

            return window.Stripe(publishableKey);

        } catch (error) {

            console.error(
                "Stripe initialization error:",
                error
            );

            showNotification(
                "Payment system could not be initialized.",
                true
            );

            return null;
        }
    }


    // ==============================
    // INITIALIZE STRIPE
    // ==============================

    stripe = await initStripe();


    // ==============================
    // DETERMINE CURRENT PAGE
    // ==============================

    const page = window.location.pathname;


    if (
        page === "/" ||
        page.endsWith("/index.html")
    ) {

        await initHomePage();

    } else if (
        page.endsWith("/cart.html")
    ) {

        displayCart();
        updateCartCount();
        setupCheckout();

    } else if (
        page.endsWith("/success.html")
    ) {

        handleSuccessfulPayment();

    } else if (page.endsWith("/admin.html")) {
    console.log("ADMIN PAGE DETECTED");
    console.log("Orders found:", getOrders());

    displayOrders();
    updateCartCount();
    } else if (
    page.endsWith("/product.html")
    ) {

    await loadProducts();
    displayProductDetails();
    updateCartCount();

    }

    // ==============================
    // HOME PAGE
    // ==============================

    async function initHomePage() {

        const productsContainer =
            document.getElementById("products-container");

        const productContainer =
            document.getElementById("product-container");


        if (!productContainer) {
            console.error(
                "Could not find #product-container"
            );
            return;
        }


        try {

            const response =
                await fetch("products.json");


            if (!response.ok) {
                throw new Error(
                    "Could not load products.json"
                );
            }


            const data =
                await response.json();


            // products.json contains:
            //
            // {
            //     categories: [...],
            //     products: [...]
            // }

            const products = data.products;


            if (!Array.isArray(products)) {
                throw new Error(
                    "The products property is not an array."
                );
            }


            allProducts = products;


            populateCategories(allProducts);

            displayProducts(allProducts);


            const searchBar =
                document.getElementById("search-bar");

            const categoryFilter =
                document.getElementById("category-filter");


            if (searchBar) {
                searchBar.addEventListener(
                    "input",
                    handleFilterChange
                );
            }


            if (categoryFilter) {
                categoryFilter.addEventListener(
                    "change",
                    handleFilterChange
                );
            }


        } catch (error) {

            console.error(
                "Error loading products:",
                error
            );


            if (productsContainer) {

                productsContainer.innerHTML = `
                    <p class="text-red-600 text-center">
                        Failed to load products.
                        Please try again later.
                    </p>
                `;
            }
        }
    }


    // ==============================
    // DISPLAY PRODUCTS
    // ==============================

    function displayProducts(products) {

        const productContainer =
            document.getElementById("product-container");


        if (!productContainer) {
            return;
        }


        productContainer.innerHTML = "";


        if (products.length === 0) {

            productContainer.innerHTML = `
                <p class="text-gray-600">
                    No products match your search.
                </p>
            `;

            return;
        }


        products.forEach(product => {

            const card =
                document.createElement("div");


            card.className = `
                bg-white border border-gray-200
                rounded-lg overflow-hidden p-4
                shadow-sm transition transform
                hover:shadow-md flex flex-col
            `;


            card.innerHTML = `

                <a
                    href="product.html?pid=${encodeURIComponent(product.id)}"
                    class="block"
                >

                    <img
                        src="${product.image}"
                        alt="${product.name}"
                        class="w-full h-52 object-contain mb-4"
                    >

                    <h3 class="text-base font-medium mb-2">
                        ${product.name}
                    </h3>

                </a>


                <p class="text-green-600 text-lg font-semibold mb-4">
                    ₹${Number(product.price).toFixed(2)}
                </p>


                <div class="mt-auto flex items-center gap-3">

                    <a
                        href="product.html?pid=${encodeURIComponent(product.id)}"
                        class="
                            inline-flex items-center
                            justify-center px-4 py-2
                            border border-gray-300
                            text-gray-700 rounded-md
                            text-sm font-medium
                            hover:bg-gray-50
                        "
                    >
                        View Details
                    </a>


                    <button
                        class="
                            add-to-cart-btn
                            inline-flex items-center
                            justify-center px-3 py-2
                            bg-blue-600 text-white
                            rounded-md text-sm
                            font-medium
                            hover:bg-blue-700
                        "
                    >
                        Add to Cart
                    </button>

                </div>
            `;


            const addButton =
                card.querySelector(".add-to-cart-btn");


            if (addButton) {

                addButton.addEventListener(
                    "click",
                    () => {

                        addToCart(product, 1);

                    }
                );
            }


            productContainer.appendChild(card);

        });
    }
// ==============================
// LOAD PRODUCTS
// ==============================

async function loadProducts() {

    try {

        const response =
            await fetch("products.json");

        if (!response.ok) {
            throw new Error("Could not load products.json");
        }

        const data =
            await response.json();

        allProducts = data.products;

        console.log("Products loaded:", allProducts);

    } catch (error) {

        console.error("Error loading products:", error);

    }

}
// ==============================
// DISPLAY SINGLE PRODUCT
// ==============================

function displayProductDetails() {

    const productDetails =
        document.getElementById("product-details");

    if (!productDetails) {
        return;
    }

    // Get product ID from URL
    const params = new URLSearchParams(window.location.search);
    const productId = params.get("pid");

    if (!productId) {
        productDetails.innerHTML = `
            <div class="max-w-screen-xl mx-auto px-6">
                <p class="text-red-600 text-lg">
                    Product not found.
                </p>
            </div>
        `;
        return;
    }

    // Find the selected product
    const product = allProducts.find(
        item => String(item.id) === String(productId)
    );

    if (!product) {
        productDetails.innerHTML = `
            <div class="max-w-screen-xl mx-auto px-6">
                <p class="text-red-600 text-lg">
                    Product not found.
                </p>
            </div>
        `;
        return;
    }

    // Display product
    productDetails.innerHTML = `

        <div class="max-w-screen-xl mx-auto px-6">

            <div class="bg-white rounded-lg shadow-md p-6">

                <div class="grid grid-cols-1 md:grid-cols-2 gap-8">

                    <!-- Product Image -->
                    <div>
                        <img
                            src="${product.image}"
                            alt="${product.name}"
                            class="w-full h-96 object-contain"
                        >
                    </div>


                    <!-- Product Information -->
                    <div>

                        <h1 class="text-3xl font-bold mb-4">
                            ${product.name}
                        </h1>

                        <p class="text-gray-600 mb-2">
                            Brand: ${product.brand}
                        </p>

                        <p class="text-yellow-500 mb-4">
                            ★ ${product.rating}
                        </p>

                        <div class="mb-4">

                            <span class="text-3xl font-bold text-green-600">
                                ₹${Number(product.price).toFixed(2)}
                            </span>

                            ${
                                product.originalPrice
                                ? `
                                    <span class="text-gray-400 line-through ml-3">
                                        ₹${Number(product.originalPrice).toFixed(2)}
                                    </span>
                                `
                                : ""
                            }

                        </div>

                        ${
                            product.discount
                            ? `
                                <p class="text-green-600 font-medium mb-4">
                                    ${product.discount}% OFF
                                </p>
                            `
                            : ""
                        }

                        <p class="text-gray-700 mb-6">
                            ${product.description}
                        </p>

                        ${
                            product.colors
                            ? `
                                <div class="mb-4">
                                    <h3 class="font-semibold mb-2">
                                        Available Colors
                                    </h3>

                                    <p class="text-gray-600">
                                        ${product.colors.join(", ")}
                                    </p>
                                </div>
                            `
                            : ""
                        }

                        ${
                            product.sizes
                            ? `
                                <div class="mb-4">
                                    <h3 class="font-semibold mb-2">
                                        Available Sizes
                                    </h3>

                                    <p class="text-gray-600">
                                        ${product.sizes.join(", ")}
                                    </p>
                                </div>
                            `
                            : ""
                        }

                        <p class="mb-6">
                            ${
                                product.inStock
                                ? `<span class="text-green-600 font-medium">✓ In Stock</span>`
                                : `<span class="text-red-600 font-medium">✗ Out of Stock</span>`
                            }
                        </p>

                        <button
                            id="product-add-to-cart"
                            class="bg-blue-600 text-white px-6 py-3 rounded-md
                                   font-medium hover:bg-blue-700"
                        >
                            Add to Cart
                        </button>

                    </div>

                </div>

            </div>

        </div>
    `;


    // Add selected product to cart
    const addButton =
        document.getElementById("product-add-to-cart");

    if (addButton) {

        addButton.addEventListener("click", () => {

            addToCart(product, 1);

        });

    }

}

    // ==============================
    // CATEGORY FILTER
    // ==============================

    function populateCategories(products) {

        const categoryFilter =
            document.getElementById("category-filter");


        if (!categoryFilter) {
            return;
        }


        // Remove old category options
        categoryFilter.innerHTML = `
            <option value="all">
                All Categories
            </option>
        `;


        const categories =
            [
                ...new Set(
                    products.map(product => product.category)
                )
            ];


        categories.forEach(category => {

            const option =
                document.createElement("option");


            option.value = category;


            option.textContent =
                category.charAt(0).toUpperCase() +
                category.slice(1);


            categoryFilter.appendChild(option);

        });
    }


    // ==============================
    // SEARCH + CATEGORY FILTER
    // ==============================

    function handleFilterChange() {

        const searchBar =
            document.getElementById("search-bar");

        const categoryFilter =
            document.getElementById("category-filter");


        const searchTerm =
            searchBar
                ? searchBar.value.toLowerCase().trim()
                : "";


        const selectedCategory =
            categoryFilter
                ? categoryFilter.value
                : "all";


        let filteredProducts =
            [...allProducts];


        // Category filter

        if (selectedCategory !== "all") {

            filteredProducts =
                filteredProducts.filter(
                    product =>
                        product.category === selectedCategory
                );
        }


        // Search filter

        if (searchTerm !== "") {

            filteredProducts =
                filteredProducts.filter(product =>

                    product.name
                        .toLowerCase()
                        .includes(searchTerm)

                    ||

                    product.description
                        .toLowerCase()
                        .includes(searchTerm)

                );
        }


        displayProducts(filteredProducts);
    }


    // ==============================
    // ADD TO CART
    // ==============================

    function addToCart(product, quantity = 1) {

        let cart = getCart();


        const id = product.id;


        const existingProduct =
            cart.find(item => item.id === id);


        if (existingProduct) {

            existingProduct.quantity += quantity;

        } else {

            const itemToAdd = {

                id: product.id,

                title: product.name,

                price: Number(product.price),

                image: product.image,

                quantity: quantity
            };


            cart.push(itemToAdd);
        }


        saveCart(cart);

        updateCartCount();

        showNotification(
            `${product.name} added to cart`
        );
    }


    // ==============================
    // CART COUNT
    // ==============================

    function updateCartCount() {

        const cartCountElement =
            document.getElementById("cart-count");


        if (!cartCountElement) {
            return;
        }


        const cart =
            getCart();


        const totalQuantity =
            cart.reduce(
                (sum, item) =>
                    sum + item.quantity,
                0
            );


        cartCountElement.textContent =
            totalQuantity;
    }


    // ==============================
    // DISPLAY CART
    // ==============================

    function displayCart() {

        const cartContainer =
            document.getElementById(
                "cart-items-container"
            );


        const cartTotalElement =
            document.getElementById(
                "cart-total"
            );


        const checkoutButton =
            document.getElementById(
                "checkout-button"
            );


        if (!cartContainer) {
            return;
        }


        const cart =
            getCart();


        if (cart.length === 0) {

            cartContainer.innerHTML = `
                <p class="text-gray-600">
                    Your cart is empty.
                </p>
            `;


            if (cartTotalElement) {
                cartTotalElement.textContent =
                    "0.00";
            }


            if (checkoutButton) {
                checkoutButton.disabled = true;
            }


            return;
        }


        let total = 0;


        cartContainer.innerHTML =
            cart.map(item => {

                total +=
                    item.price *
                    item.quantity;


                return `

                    <div
                        class="
                            flex items-center gap-6
                            bg-white p-4
                            rounded-lg shadow-sm
                        "
                    >

                        <img
                            src="${item.image}"
                            alt="${item.title}"
                            class="
                                w-20 h-20
                                object-contain
                            "
                        >


                        <div class="flex-1">

                            <h4 class="font-medium mb-2">
                                ${item.title}
                            </h4>

                            <p class="text-gray-600">
                                ₹${item.price.toFixed(2)}
                                x
                                ${item.quantity}
                            </p>

                        </div>


                        <div
                            class="
                                flex items-center
                                gap-3
                            "
                        >

                            <p class="font-semibold">
                                ₹${(
                                     item.price *
                                     item.quantity
                                    ).toFixed(2)}
                            </p>


                            <button
                                data-id="${item.id}"
                                class="
                                    remove-item-btn
                                    inline-flex
                                    items-center
                                    justify-center
                                    border
                                    border-red-300
                                    text-red-600
                                    px-3 py-1.5
                                    rounded-md
                                    text-sm
                                    hover:bg-red-50
                                "
                            >
                                Remove
                            </button>

                        </div>

                    </div>

                `;

            }).join("");


        // Remove buttons

        cartContainer
            .querySelectorAll(".remove-item-btn")
            .forEach(button => {

                button.addEventListener(
                    "click",
                    () => {

                        const id =
                            button.getAttribute(
                                "data-id"
                            );

                        removeFromCart(id);
                    }
                );

            });


        if (cartTotalElement) {

            cartTotalElement.textContent =
                total.toFixed(2);
        }


        if (checkoutButton) {
            checkoutButton.disabled = false;
        }
    }


    // ==============================
    // REMOVE FROM CART
    // ==============================

    function removeFromCart(id) {

        let cart =
            getCart();


        const originalLength =
            cart.length;


        cart =
            cart.filter(
                item =>
                    String(item.id) !== String(id)
            );


        saveCart(cart);

        updateCartCount();

        displayCart();


        if (cart.length < originalLength) {

            showNotification(
                "Item removed from cart"
            );
        }
    }


    // ==============================
    // STRIPE CHECKOUT
    // ==============================

    function setupCheckout() {

        const checkoutButton =
            document.getElementById(
                "checkout-button"
            );


        if (!checkoutButton) {
            return;
        }


        checkoutButton.addEventListener(
            "click",
            async () => {

                const cart =
                    getCart();


                if (cart.length === 0) {

                    showNotification(
                        "Your cart is empty",
                        true
                    );

                    return;
                }


                if (!stripe) {

                    stripe =
                        await initStripe();


                    if (!stripe) {
                        return;
                    }
                }


                checkoutButton.disabled = true;


                try {

                    const response =
                        await fetch(
                            `${BACKEND_URL}/create-checkout-session`,
                            {
                                method: "POST",

                                headers: {
                                    "Content-Type":
                                        "application/json"
                                },

                                body:
                                    JSON.stringify({
                                        cart: cart
                                    })
                            }
                        );


                    if (!response.ok) {

                        const errorData =
                            await response.json()
                                .catch(() => ({}));


                        throw new Error(
                            errorData.error ||
                            "Unable to create checkout session."
                        );
                    }


                    const session =
                        await response.json();


                    if (!session.id) {

                        throw new Error(
                            "Stripe session ID was not returned by the server."
                        );
                    }


                    const result =
                        await stripe.redirectToCheckout({
                            sessionId: session.id
                        });


                    if (result.error) {

                        throw new Error(
                            result.error.message
                        );
                    }


                } catch (error) {

                    console.error(
                        "Checkout error:",
                        error
                    );


                    showNotification(
                        error.message,
                        true
                    );


                    checkoutButton.disabled =
                        false;
                }

            }
        );
    }


// ==============================
// SUCCESSFUL PAYMENT
// ==============================

function handleSuccessfulPayment() {

    const cart = getCart();

    if (cart.length === 0) {
        return;
    }

    const orders = getOrders();

    const newOrder = {

        id:
            `order_${Date.now()}`,

        date:
            new Date().toISOString(),

        items:
            cart,

        total:
            cart.reduce(
                (sum, item) =>
                    sum +
                    item.price *
                    item.quantity,
                0
            )
    };

    orders.push(newOrder);

    saveOrders(orders);

    saveCart([]);

    console.log(
        "Payment successful. Order saved:",
        newOrder
    );
}


// ==============================
// DISPLAY ORDERS
// ==============================

function displayOrders() {
    const ordersContainer = document.getElementById("orders-container");

    if (!ordersContainer) return;

    const orders = getOrders();

    if (orders.length === 0) {
        ordersContainer.innerHTML = `
            <div class="bg-white p-6 rounded-lg shadow">
                <p class="text-gray-600">
                    No payment history found.
                </p>
            </div>
        `;
        return;
    }

    ordersContainer.innerHTML = orders.map((order, index) => {

        const productsHTML = order.items.map(item => `
            <div class="flex items-center gap-4 border-b py-4">

                <img
                    src="${item.image}"
                    alt="${item.title}"
                    class="w-20 h-20 object-cover rounded"
                >

                <div>
                    <p class="font-semibold text-lg">
                        ${item.title}
                    </p>

                    <p class="text-gray-600">
                        Price: ₹${item.price}
                    </p>

                    <p class="text-gray-600">
                        Quantity: ${item.quantity}
                    </p>

                    <p class="font-medium">
                        Subtotal: ₹${item.price * item.quantity}
                    </p>
                </div>

            </div>
        `).join("");

        return `
            <div class="bg-white rounded-lg shadow p-5 mb-4">

                <div class="flex justify-between items-center">

                    <div>
                        <h3 class="text-lg font-semibold">
                            Order #${index + 1}
                        </h3>

                        <p class="text-sm text-gray-500">
                            ${new Date(order.date).toLocaleString()}
                        </p>

                        <p class="mt-2 font-medium">
                            Total: ₹${order.total}
                        </p>
                    </div>

                    <button
                        type="button"
                        class="view-details-btn bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                        data-order-index="${index}">
                        View Details
                    </button>

                </div>

                <div
                    class="order-details mt-5 border-t pt-4"
                    data-details-index="${index}"
                    style="display: none;">

                    <h4 class="font-semibold text-lg mb-3">
                        Purchased Products
                    </h4>

                    ${productsHTML}

                </div>

            </div>
        `;
    }).join("");

// View Details buttons
const buttons = document.querySelectorAll(".view-details-btn");

buttons.forEach(button => {

    button.addEventListener("click", function () {

        const index = this.getAttribute("data-order-index");

        const details = document.querySelector(
            `.order-details[data-details-index="${index}"]`
        );

        if (!details) {
            console.error("Order details not found for order:", index);
            return;
        }

        details.style.display =
            details.style.display === "none" ? "block" : "none";

        this.textContent =
            details.style.display === "block"
                ? "Hide Details"
                : "View Details";

    });

});
}

// Update cart count on every page

updateCartCount();

});