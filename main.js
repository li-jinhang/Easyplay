(function () {
    var USERNAME_PATTERN = /^[a-zA-Z0-9_]{3,32}$/;
    var EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    var APP_BASE_PATH = getAppBasePath();

    function ensureLeadingSlash(pathname) {
        if (!pathname) {
            return "/";
        }
        return pathname.charAt(0) === "/" ? pathname : "/" + pathname;
    }

    function ensureTrailingSlash(pathname) {
        var normalized = ensureLeadingSlash(pathname || "/");
        return normalized.charAt(normalized.length - 1) === "/" ? normalized : normalized + "/";
    }

    function getAppBasePath() {
        var currentScript = document.currentScript;
        if (currentScript && currentScript.src) {
            try {
                var scriptUrl = new URL(currentScript.src, window.location.href);
                var scriptPath = scriptUrl.pathname || "/";
                return ensureTrailingSlash(scriptPath.slice(0, scriptPath.lastIndexOf("/") + 1));
            } catch (error) {
                // ignore and fallback to pathname detection
            }
        }

        var pathname = window.location.pathname || "/";
        if (pathname === "/") {
            return "/";
        }
        if (pathname.charAt(pathname.length - 1) === "/") {
            return ensureTrailingSlash(pathname);
        }
        var lastSlash = pathname.lastIndexOf("/");
        if (lastSlash <= 0) {
            return ensureTrailingSlash(pathname);
        }
        return ensureTrailingSlash(pathname.slice(0, lastSlash + 1));
    }

    function buildAppUrl(pathname) {
        var normalizedPath = String(pathname || "").replace(/^\/+/, "");
        return APP_BASE_PATH + normalizedPath;
    }

    function initHomePage() {
        var loginModal = document.getElementById("loginModal");
        var registerModal = document.getElementById("registerModal");
        var openLoginBtn = document.getElementById("openLoginBtn");
        var closeLoginBtn = document.getElementById("closeLoginBtn");
        var closeRegisterBtn = document.getElementById("closeRegisterBtn");
        var openRegisterFromLoginBtn = document.getElementById("openRegisterFromLoginBtn");
        var backToLoginBtn = document.getElementById("backToLoginBtn");

        var loginForm = document.getElementById("loginForm");
        var registerForm = document.getElementById("registerForm");
        var loginBtn = document.getElementById("loginBtn");
        var registerBtn = document.getElementById("registerBtn");
        var loginState = document.getElementById("loginState");
        var loginMessage = document.getElementById("loginMessage");
        var registerMessage = document.getElementById("registerMessage");

        var usernameInput = document.getElementById("username");
        var passwordInput = document.getElementById("password");
        var registerUsernameInput = document.getElementById("registerUsername");
        var registerEmailInput = document.getElementById("registerEmail");
        var registerPasswordInput = document.getElementById("registerPassword");
        var registerConfirmPasswordInput = document.getElementById("registerConfirmPassword");

        var registerUsernameError = document.getElementById("registerUsernameError");
        var registerEmailError = document.getElementById("registerEmailError");
        var registerPasswordError = document.getElementById("registerPasswordError");
        var registerConfirmPasswordError = document.getElementById("registerConfirmPasswordError");
        var gameCards = document.querySelectorAll(".game-card[data-route]");

        if (
            !loginModal ||
            !registerModal ||
            !openLoginBtn ||
            !closeLoginBtn ||
            !closeRegisterBtn ||
            !openRegisterFromLoginBtn ||
            !backToLoginBtn ||
            !loginForm ||
            !registerForm
        ) {
            // 页面结构异常时直接退出，避免报错导致其它按钮失效。
            return;
        }

        function openModal(modal, focusInput) {
            modal.classList.add("is-open");
            modal.setAttribute("aria-hidden", "false");
            if (focusInput) {
                window.setTimeout(function () {
                    focusInput.focus();
                }, 80);
            }
        }

        function closeModal(modal, focusTarget) {
            modal.classList.remove("is-open");
            modal.setAttribute("aria-hidden", "true");
            if (focusTarget) {
                focusTarget.focus();
            }
        }

        function setMessage(targetElement, message, isSuccess) {
            targetElement.textContent = message;
            if (!message) {
                targetElement.className = "login-message";
                return;
            }
            targetElement.className = "login-message " + (isSuccess ? "success" : "error");
        }

        function setFieldError(inputEl, errorEl, errorText) {
            errorEl.textContent = errorText;
            if (errorText) {
                inputEl.classList.add("invalid");
            } else {
                inputEl.classList.remove("invalid");
            }
        }

        function setLoggedInState(username) {
            loginState.textContent = "当前登录用户：" + username;
            sessionStorage.setItem("easyplay_login_user", username);
        }

        function setLoggedOutState() {
            loginState.textContent = "当前未登录";
        }

        function validateLoginInput(username, password) {
            if (!username) {
                return "用户名不能为空";
            }
            if (!USERNAME_PATTERN.test(username)) {
                return "用户名需为3-32位字母/数字/下划线";
            }
            if (!password) {
                return "密码不能为空";
            }
            if (password.length !== 8) {
                return "密码长度必须为8位";
            }
            return "";
        }

        function validateRegisterInput() {
            var username = registerUsernameInput.value.trim();
            var email = registerEmailInput.value.trim();
            var password = registerPasswordInput.value;
            var confirmPassword = registerConfirmPasswordInput.value;

            var usernameError = "";
            var emailError = "";
            var passwordError = "";
            var confirmPasswordError = "";

            if (!username) {
                usernameError = "用户名不能为空";
            } else if (!USERNAME_PATTERN.test(username)) {
                usernameError = "用户名需为3-32位字母/数字/下划线";
            }

            if (!email) {
                emailError = "邮箱不能为空";
            } else if (!EMAIL_PATTERN.test(email)) {
                emailError = "邮箱格式不正确";
            }

            if (!password) {
                passwordError = "密码不能为空";
            } else if (password.length !== 8) {
                passwordError = "密码长度必须为8位";
            }

            if (!confirmPassword) {
                confirmPasswordError = "确认密码不能为空";
            } else if (confirmPassword !== password) {
                confirmPasswordError = "两次输入的密码不一致";
            }

            setFieldError(registerUsernameInput, registerUsernameError, usernameError);
            setFieldError(registerEmailInput, registerEmailError, emailError);
            setFieldError(registerPasswordInput, registerPasswordError, passwordError);
            setFieldError(registerConfirmPasswordInput, registerConfirmPasswordError, confirmPasswordError);

            return usernameError || emailError || passwordError || confirmPasswordError;
        }

        function postJson(url, body, onSuccess, onFail) {
            var xhr = new XMLHttpRequest();
            xhr.open("POST", url, true);
            xhr.setRequestHeader("Content-Type", "application/json;charset=UTF-8");
            xhr.withCredentials = true;
            xhr.onreadystatechange = function () {
                if (xhr.readyState !== 4) {
                    return;
                }
                var data = {};
                try {
                    data = xhr.responseText ? JSON.parse(xhr.responseText) : {};
                } catch (e) {
                    data = {};
                }
                if (xhr.status >= 200 && xhr.status < 300) {
                    onSuccess(data);
                    return;
                }
                onFail({
                    status: xhr.status,
                    data: data
                });
            };
            xhr.onerror = function () {
                onFail({
                    status: 0,
                    data: {}
                });
            };
            xhr.send(JSON.stringify(body));
        }

        function postWithFallback(pathname, payload, onSuccess, onFail) {
            var normalizedPath = String(pathname || "").replace(/^\/+/, "");
            var endpoints = [];

            function pushEndpoint(url) {
                if (endpoints.indexOf(url) === -1) {
                    endpoints.push(url);
                }
            }

            pushEndpoint(buildAppUrl(normalizedPath));
            pushEndpoint("/" + normalizedPath);
            pushEndpoint("http://localhost:3000/" + normalizedPath);

            function tryNext(index) {
                if (index >= endpoints.length) {
                    onFail({
                        status: 0,
                        data: {
                            error: "无法连接认证服务，请确认 npm 服务已启动。"
                        }
                    });
                    return;
                }

                postJson(
                    endpoints[index],
                    payload,
                    onSuccess,
                    function (err) {
                        if (err.status === 0 && index < endpoints.length - 1) {
                            tryNext(index + 1);
                            return;
                        }
                        onFail(err);
                    }
                );
            }

            tryNext(0);
        }

        function handleRegisterSuccess(registeredUsername, message) {
            registerBtn.disabled = false;
            registerBtn.textContent = "提交注册";
            setMessage(registerMessage, message || "注册成功", true);

            usernameInput.value = registeredUsername;
            passwordInput.value = "";
            closeModal(registerModal, null);
            openModal(loginModal, passwordInput);
            setMessage(loginMessage, "注册成功，请输入密码登录。", true);
        }

        function navigateToRoute(route) {
            if (!route) {
                return;
            }
            window.location.href = route;
        }

        loginForm.addEventListener("submit", function (event) {
            event.preventDefault();
            var username = usernameInput.value.trim();
            var password = passwordInput.value;
            var validationError = validateLoginInput(username, password);

            if (validationError) {
                setMessage(loginMessage, validationError, false);
                return;
            }

            setMessage(loginMessage, "", true);
            loginBtn.disabled = true;
            loginBtn.textContent = "登录中...";

            postWithFallback(
                "api/login",
                {
                    username: username,
                    password: password
                },
                function (data) {
                    setMessage(loginMessage, data.message || "登录成功", true);
                    setLoggedInState(username);
                    loginBtn.disabled = false;
                    loginBtn.textContent = "登录";
                },
                function (err) {
                    var apiMessage = err.data && err.data.error ? err.data.error : "";
                    setMessage(loginMessage, apiMessage || "登录失败，请检查用户名和密码。", false);
                    loginBtn.disabled = false;
                    loginBtn.textContent = "登录";
                }
            );
        });

        registerForm.addEventListener("submit", function (event) {
            event.preventDefault();

            var validationError = validateRegisterInput();
            if (validationError) {
                setMessage(registerMessage, validationError, false);
                return;
            }

            var payload = {
                username: registerUsernameInput.value.trim(),
                email: registerEmailInput.value.trim(),
                password: registerPasswordInput.value
            };

            setMessage(registerMessage, "", true);
            registerBtn.disabled = true;
            registerBtn.textContent = "提交中...";

            postWithFallback(
                "api/register",
                payload,
                function (data) {
                    registerForm.reset();
                    validateRegisterInput();
                    handleRegisterSuccess(payload.username, data.message);
                },
                function (err) {
                    var apiMessage = err.data && err.data.error ? err.data.error : "";
                    setMessage(registerMessage, apiMessage || "注册失败，请稍后重试。", false);
                    registerBtn.disabled = false;
                    registerBtn.textContent = "提交注册";
                }
            );
        });

        [registerUsernameInput, registerEmailInput, registerPasswordInput, registerConfirmPasswordInput].forEach(function (input) {
            input.addEventListener("input", function () {
                validateRegisterInput();
            });
        });

        gameCards.forEach(function (card) {
            card.addEventListener("click", function () {
                navigateToRoute(card.getAttribute("data-route"));
            });
            card.addEventListener("keydown", function (event) {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    navigateToRoute(card.getAttribute("data-route"));
                }
            });
        });

        openLoginBtn.addEventListener("click", function () {
            openModal(loginModal, usernameInput);
        });
        closeLoginBtn.addEventListener("click", function () {
            closeModal(loginModal, openLoginBtn);
        });
        openRegisterFromLoginBtn.addEventListener("click", function () {
            setMessage(loginMessage, "", true);
            closeModal(loginModal, null);
            openModal(registerModal, registerUsernameInput);
        });
        closeRegisterBtn.addEventListener("click", function () {
            closeModal(registerModal, openLoginBtn);
        });
        backToLoginBtn.addEventListener("click", function () {
            closeModal(registerModal, null);
            openModal(loginModal, usernameInput);
        });

        [loginModal, registerModal].forEach(function (modal) {
            modal.addEventListener("click", function (event) {
                if (event.target === modal) {
                    closeModal(modal, openLoginBtn);
                }
            });
        });

        document.addEventListener("keydown", function (event) {
            if (event.key !== "Escape") {
                return;
            }
            if (registerModal.classList.contains("is-open")) {
                closeModal(registerModal, openLoginBtn);
                return;
            }
            if (loginModal.classList.contains("is-open")) {
                closeModal(loginModal, openLoginBtn);
            }
        });

        validateRegisterInput();

        var savedUser = sessionStorage.getItem("easyplay_login_user");
        if (savedUser) {
            setLoggedInState(savedUser);
        } else {
            setLoggedOutState();
        }
    }

    if (document.readyState === "loading") {
        document.addEventListener("DOMContentLoaded", initHomePage);
    } else {
        initHomePage();
    }
})();
