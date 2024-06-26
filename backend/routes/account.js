const express = require("express");
const router = express.Router();
const { Account } = require("../db");
const { authMiddleware } = require("../middleware");
const mongoose = require("mongoose");

router.get("/balance", authMiddleware, async (req, res) => {
  const account = await Account.findOne({
    userId: req.userId,
  });

  res.status(200).json({
    balance: account.balance,
  });
});

router.post("/transfer", authMiddleware, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  const { to, amount } = req.body;

  try {
    const account = await Account.findOne({
      userId: req.userId,
    }).session(session);

    //   Insufficient balance
    if (!account || account.balance < amount) {
      await session.abortTransaction();
      return res.status(400).json({
        error: "Insufficient balance",
      });
    }

    const toAccount = await Account.findOne({
      userId: to,
    });

    //   Invalid account
    if (!toAccount) {
      await session.abortTransaction();
      res.status(400).json({
        message: "Invalid account",
      });
      return;
    }

    await Account.updateOne(
      { userId: req.userId },
      { $inc: { balance: -amount } }
    ).session(session);

    await Account.updateOne(
      { userId: to },
      { $inc: { balance: amount } }
    ).session(session);

    await session.commitTransaction();
    res.json({
      message: "Transfer successful",
    });
  } catch (err) {
    await session.abortTransaction();
    res.json({
      message: "Something went wrong",
    });
  }
});

module.exports = router;
