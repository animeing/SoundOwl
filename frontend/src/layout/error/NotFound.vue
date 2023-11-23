<template>
    <div class="not-found">
        <h1>404</h1>
        <h2>Oops! Page not found.</h2>
        <p>The page you are looking for does not exist or has moved.</p>
        <router-link to="/">
            Go back home
        </router-link>
    </div>
</template>

<script>
export default {
  name: 'NotFound'
};
</script>

<style scoped>
.not-found {
  text-align: center;
  margin-top: 50px;
}

.not-found h1 {
  font-size: 6em;
}

.not-found h2 {
  font-size: 2em;
}

.not-found p {
  margin: 20px 0;
}

.not-found a {
  display: inline-block;
  margin-top: 20px;
  padding: 10px 20px;
  background-color: #333;
  color: #fff;
  text-decoration: none;
  transition: background-color 0.3s;
}

.not-found a:hover {
  background-color: #555;
}
</style>
