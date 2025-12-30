import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/context/auth-context";
import { Layout } from "@/components/Layout";
import Home from "@/pages/Home";
import Login from "@/pages/Login";
import Register from "@/pages/Register";

function App() {
  return (
    <Router>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
          </Route>
        </Routes>
      </AuthProvider>
    </Router>
  );
}

export default App;
