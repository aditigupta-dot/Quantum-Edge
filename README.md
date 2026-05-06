# ⚛️ Quantum Edge

## 🚀 Overview

I built **Quantum Edge** to explore how quantum computing can be applied to something practical like **portfolio optimization**.

When the number of assets increases, selecting the best combination becomes a complex problem. Instead of using only traditional approaches, I experimented with **QAOA (Quantum Approximate Optimization Algorithm)** using **Qiskit** to model this as an optimization problem.

This project is more about **learning by building**—understanding the algorithm and seeing how it performs when applied to balancing **risk and return**.

---

## 💡 What this project does

* Takes a set of assets and their data
* Converts the problem into an optimization format (QUBO)
* Applies **QAOA** to search for better combinations
* Outputs an **optimized portfolio** based on risk and return

---

## 🧠 What I learned

* How QAOA actually works beyond theory
* Using **Qiskit** for optimization problems
* Converting finance problems into QUBO form
* Structuring a project with **backend + frontend**
* The gap between theoretical and practical quantum approaches

---

## 🛠️ Tech Stack

* **Python**
* **Qiskit (QAOA)**
* **NumPy, Pandas**
* Basic **Frontend + Backend structure**

---

## 📂 Project Structure

```bash
Quantum-Edge/
│── .github/
│── backend/          # Optimization logic (QAOA)
│── frontend/         # UI / visualization
│── main.py           # Runs the project
│── requirements.txt
│── README.md
│── CONTRIBUTING.md
│── CODE_OF_CONDUCT.md
│── LICENSE
```

---

## ⚙️ How it works (simple flow)

1. Define assets and constraints
2. Convert the problem → QUBO
3. Run QAOA using Qiskit
4. Evaluate risk vs return
5. Output best asset allocation

---

## ▶️ How to run

```bash
git clone https://github.com/your-username/Quantum-Edge.git
cd Quantum-Edge
pip install -r requirements.txt
python main.py
```

### Frontend (if applicable)

```bash
cd frontend
npm install
npm start
```

---

## 📊 Output

* Selected assets
* Portfolio distribution
* Risk vs Return comparison

*(I’ll be adding proper visualizations/graphs soon)*

---

## 🔮 Future improvements

* Add real market data
* Improve optimization accuracy
* Compare with classical algorithms
* Build a better UI/dashboard

---

## 🤝 Contributing

Open to improvements and suggestions. Feel free to fork and contribute.

---

## 👩‍💻 Author

Aditi Gupta
CSE (AI/ML) student exploring AI + Quantum Computing

---

## ⭐

If you found this interesting, consider giving it a star ⭐
