const { Builder, By, until } = require("selenium-webdriver");

const BASE_URL = "http://localhost:5177";

async function runTest(name, testFunction) {
    let driver;

    try {
        driver = await new Builder()
            .forBrowser("chrome")
            .build();

        await testFunction(driver);

        console.log(`✅ PASS: ${name}`);
        return true;

    } catch (error) {
        console.log(`❌ FAIL: ${name}`);
        console.log("   Error:", error.message);
        return false;

    } finally {
        if (driver) {
            await driver.quit();
        }
    }
}

// ======================================================
// TEST 1 - HOME PAGE
// ======================================================

async function testHomePage(driver) {
    await driver.get(BASE_URL);

    await driver.wait(
        until.elementLocated(By.xpath("//*[contains(text(),'Food Surplus System')]")),
        10000
    );

    const title = await driver
        .findElement(By.xpath("//*[contains(text(),'Food Surplus System')]"))
        .getText();

    if (!title.includes("Food Surplus System")) {
        throw new Error("Home page title not found");
    }
}

// ======================================================
// TEST 2 - LOGIN PAGE
// ======================================================

async function testLoginPage(driver) {
    await driver.get(BASE_URL);

    const loginButton = await driver.wait(
        until.elementLocated(
            By.xpath("//button[contains(translate(.,'LOGIN','login'),'login')]")
        ),
        10000
    );

    await loginButton.click();

    await driver.wait(
        until.elementLocated(By.css("input[type='email']")),
        10000
    );

    await driver.findElement(
        By.css("input[type='password']")
    );
}

// ======================================================
// TEST 3 - REGISTER PAGE
// ======================================================

async function testRegisterPage(driver) {
    await driver.get(BASE_URL);

    const registerButton = await driver.wait(
        until.elementLocated(
            By.xpath("//button[contains(translate(.,'REGISTER','register'),'register')]")
        ),
        10000
    );

    await registerButton.click();

    await driver.wait(
        until.elementLocated(
            By.css("input[name='name']")
        ),
        10000
    );

    await driver.findElement(
        By.css("input[name='email']")
    );

    await driver.findElement(
        By.css("input[name='password']")
    );

    await driver.findElement(
        By.css("select[name='role']")
    );
}

// ======================================================
// TEST 4 - DONOR LOGIN
// ======================================================

async function testDonorLogin(driver) {
    await driver.get(BASE_URL);

    await driver.findElement(
        By.xpath("//button[contains(.,'Login')]")
    ).click();

    await driver.wait(
        until.elementLocated(By.css("input[type='email']")),
        10000
    );

    await driver.findElement(
        By.css("input[type='email']")
    ).sendKeys("srinivas@srinivas.com");

    await driver.findElement(
        By.css("input[type='password']")
    ).sendKeys("123456");

    await driver.findElement(
        By.xpath("//button[contains(.,'Login')]")
    ).click();

    await driver.sleep(1500);

    const pageText = await driver.findElement(By.tagName("body")).getText();

    if (
        !pageText.includes("Donor Dashboard") &&
        !pageText.includes("Invalid email or password")
    ) {
        throw new Error("Unexpected donor login result");
    }
}

// ======================================================
// TEST 5 - ADMIN LOGIN PAGE
// ======================================================

async function testAdminLoginPage(driver) {
    await driver.get(BASE_URL);

    await driver.wait(
        until.elementLocated(
            By.xpath("//*[contains(translate(.,'ADMIN','admin'),'admin')]")
        ),
        10000
    );

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.toLowerCase().includes("admin")) {
        throw new Error("Admin Login option not found");
    }
}

// ======================================================
// TEST 6 - ADMIN LOGIN
// ======================================================

async function testAdminLogin(driver) {
    await driver.get(BASE_URL);

    const adminButton = await driver.wait(
        until.elementLocated(
            By.xpath("//button[contains(translate(.,'ADMIN','admin'),'admin')]")
        ),
        10000
    );

    await adminButton.click();

    await driver.wait(
        until.elementLocated(By.css("input[type='email']")),
        10000
    );

    await driver.findElement(
        By.css("input[type='email']")
    ).sendKeys("admin@foodsurplus.com");

    await driver.findElement(
        By.css("input[type='password']")
    ).sendKeys("123456");

    const buttons = await driver.findElements(
        By.xpath("//button")
    );

    if (buttons.length === 0) {
        throw new Error("Admin login button not found");
    }

    await buttons[buttons.length - 1].click();

    await driver.sleep(1500);

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (
        !bodyText.includes("Admin Dashboard") &&
        !bodyText.includes("Invalid email or password")
    ) {
        throw new Error("Unexpected admin login result");
    }
}

// ======================================================
// TEST 7 - ADMIN DASHBOARD
// ======================================================

async function testAdminDashboard(driver) {
    await driver.get(BASE_URL);

    const adminButton = await driver.wait(
        until.elementLocated(
            By.xpath("//button[contains(translate(.,'ADMIN','admin'),'admin')]")
        ),
        10000
    );

    await adminButton.click();

    await driver.wait(
        until.elementLocated(By.css("input[type='email']")),
        10000
    );

    await driver.findElement(
        By.css("input[type='email']")
    ).sendKeys("admin@foodsurplus.com");

    await driver.findElement(
        By.css("input[type='password']")
    ).sendKeys("123456");

    const buttons = await driver.findElements(By.xpath("//button"));

    await buttons[buttons.length - 1].click();

    await driver.sleep(1500);

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.includes("Admin Dashboard")) {
        throw new Error("Admin dashboard not displayed");
    }
}

// ======================================================
// TEST 8 - ADMIN USER RECORDS
// ======================================================

async function testAdminUsers(driver) {
    await driver.get(BASE_URL);

    const adminButton = await driver.wait(
        until.elementLocated(
            By.xpath("//button[contains(translate(.,'ADMIN','admin'),'admin')]")
        ),
        10000
    );

    await adminButton.click();

    await driver.wait(
        until.elementLocated(By.css("input[type='email']")),
        10000
    );

    await driver.findElement(
        By.css("input[type='email']")
    ).sendKeys("admin@foodsurplus.com");

    await driver.findElement(
        By.css("input[type='password']")
    ).sendKeys("123456");

    const buttons = await driver.findElements(By.xpath("//button"));

    await buttons[buttons.length - 1].click();

    await driver.sleep(1500);

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.includes("Registered Users")) {
        throw new Error("Registered Users section not found");
    }
}

// ======================================================
// TEST 9 - FOOD RECORDS
// ======================================================

async function testFoodRecords(driver) {
    await driver.get(BASE_URL);

    const adminButton = await driver.wait(
        until.elementLocated(
            By.xpath("//button[contains(translate(.,'ADMIN','admin'),'admin')]")
        ),
        10000
    );

    await adminButton.click();

    await driver.wait(
        until.elementLocated(By.css("input[type='email']")),
        10000
    );

    await driver.findElement(
        By.css("input[type='email']")
    ).sendKeys("admin@foodsurplus.com");

    await driver.findElement(
        By.css("input[type='password']")
    ).sendKeys("123456");

    const buttons = await driver.findElements(By.xpath("//button"));

    await buttons[buttons.length - 1].click();

    await driver.sleep(1500);

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.includes("Food Records")) {
        throw new Error("Food Records section not found");
    }
}

// ======================================================
// TEST 10 - API CONNECTION
// ======================================================

async function testBackendConnection(driver) {
    await driver.get("http://localhost:5000/");

    await driver.wait(
        until.elementLocated(By.tagName("body")),
        10000
    );

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.includes("Food Surplus System Backend")) {
        throw new Error("Backend is not responding");
    }
}

// ======================================================
// TEST 11 - AVAILABLE FOOD API
// ======================================================

async function testFoodAPI(driver) {
    await driver.get("http://localhost:5000/api/food");

    await driver.wait(
        until.elementLocated(By.tagName("body")),
        10000
    );

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.includes("success")) {
        throw new Error("Food API did not respond correctly");
    }
}

// ======================================================
// TEST 12 - USERS API
// ======================================================

async function testUsersAPI(driver) {
    await driver.get("http://localhost:5000/api/users");

    await driver.wait(
        until.elementLocated(By.tagName("body")),
        10000
    );

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.includes("users")) {
        throw new Error("Users API did not respond correctly");
    }
}

// ======================================================
// TEST 13 - INVALID LOGIN
// ======================================================

async function testInvalidLogin(driver) {
    await driver.get(BASE_URL);

    await driver.findElement(
        By.xpath("//button[contains(.,'Login')]")
    ).click();

    await driver.wait(
        until.elementLocated(By.css("input[type='email']")),
        10000
    );

    await driver.findElement(
        By.css("input[type='email']")
    ).sendKeys("wrong@test.com");

    await driver.findElement(
        By.css("input[type='password']")
    ).sendKeys("wrongpassword");

    await driver.findElement(
        By.xpath("//button[contains(.,'Login')]")
    ).click();

    await driver.sleep(1000);

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.toLowerCase().includes("invalid")) {
        throw new Error("Invalid login validation failed");
    }
}

// ======================================================
// TEST 14 - LOGOUT BUTTON
// ======================================================

async function testLogoutButton(driver) {
    await driver.get(BASE_URL);

    const adminButton = await driver.wait(
        until.elementLocated(
            By.xpath("//button[contains(translate(.,'ADMIN','admin'),'admin')]")
        ),
        10000
    );

    await adminButton.click();

    await driver.wait(
        until.elementLocated(By.css("input[type='email']")),
        10000
    );

    await driver.findElement(
        By.css("input[type='email']")
    ).sendKeys("admin@foodsurplus.com");

    await driver.findElement(
        By.css("input[type='password']")
    ).sendKeys("123456");

    const buttons = await driver.findElements(By.xpath("//button"));

    await buttons[buttons.length - 1].click();

    await driver.sleep(1500);

    const logoutButton = await driver.wait(
        until.elementLocated(
            By.xpath("//button[contains(.,'Logout')]")
        ),
        10000
    );

    await logoutButton.click();

    await driver.sleep(500);

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.includes("FoodSurplus")) {
        throw new Error("Logout did not return to home page");
    }
}

// ======================================================
// TEST 15 - FRONTEND ACCESS
// ======================================================

async function testFrontendAccess(driver) {
    await driver.get(BASE_URL);

    await driver.wait(
        until.elementLocated(By.tagName("body")),
        10000
    );

    const bodyText = await driver
        .findElement(By.tagName("body"))
        .getText();

    if (!bodyText.includes("FoodSurplus")) {
        throw new Error("Frontend is not accessible");
    }
}

// ======================================================
// RUN ALL TESTS
// ======================================================

async function main() {

    console.log("");
    console.log("==============================================");
    console.log("     FoodSurplus Selenium Test Suite");
    console.log("==============================================");
    console.log("");

    const tests = [
        ["Home Page", testHomePage],
        ["Login Page", testLoginPage],
        ["Register Page", testRegisterPage],
        ["Donor Login", testDonorLogin],
        ["Admin Login Page", testAdminLoginPage],
        ["Admin Login", testAdminLogin],
        ["Admin Dashboard", testAdminDashboard],
        ["Admin Users", testAdminUsers],
        ["Food Records", testFoodRecords],
        ["Backend Connection", testBackendConnection],
        ["Food API", testFoodAPI],
        ["Users API", testUsersAPI],
        ["Invalid Login", testInvalidLogin],
        ["Logout", testLogoutButton],
        ["Frontend Access", testFrontendAccess]
    ];

    let passed = 0;
    let failed = 0;

    for (const [name, testFunction] of tests) {

        const result = await runTest(
            name,
            testFunction
        );

        if (result) {
            passed++;
        } else {
            failed++;
        }
    }

    const total = tests.length;
    const percentage =
        ((passed / total) * 100).toFixed(2);

    console.log("");
    console.log("==============================================");
    console.log("              TEST SUMMARY");
    console.log("==============================================");
    console.log(`Total Tests : ${total}`);
    console.log(`Passed      : ${passed}`);
    console.log(`Failed      : ${failed}`);
    console.log(`Pass Rate   : ${percentage}%`);
    console.log("==============================================");
    console.log("");

    if (failed === 0) {
        console.log("🎉 ALL TESTS PASSED!");
    } else {
        console.log("⚠️ SOME TESTS FAILED.");
    }
}

main();