import express from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
// import { getUserDataById } from "../models/user.models";
import cors from "cors";

const getUserDataById = (userId: string) => {
  return {
    _id: userId,
    name: "Wasay",
    email: "wasay.haqqani@algoace.com",
    profileImage: "http",
  };
};

const app = express();
const server = http.createServer(app);

app.use(cors());

const io = new SocketIOServer(server, {
  cors: {
    origin: "http://localhost:3002",
    methods: ["GET", "POST"],
  },
});

let usersArray: { userId: string; socketId: string }[] = [];
let groups: { groupId: string; groupName: string; members: string[] }[] = [];

io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("addUser", (payload: { userId: string }) => {
    console.log("addUser event received:", payload);
    const userIndex = usersArray.findIndex(
      (user) => user.userId === payload.userId
    );
    if (userIndex !== -1) {
      usersArray[userIndex].socketId = socket.id;
    } else {
      usersArray.push({
        userId: payload.userId,
        socketId: socket.id,
      });
    }
    console.log("Updated usersArray:", usersArray);
    io.emit("userList", { users: usersArray });
    socket.emit("groupList", { groups });
  });

  socket.on(
    "createGroup",
    (payload: { groupId: string; groupName: string; userId: string }) => {
      console.log("createGroup event received:", payload);
      const { groupId, groupName, userId } = payload;
      const newGroup = { groupId, groupName, members: [userId] };
      groups.push(newGroup);
      console.log("Updated groups:", groups);
      io.emit("groupCreated", newGroup);
      io.emit("groupList", { groups });
    }
  );

  socket.on("joinGroup", (payload: { userId: string; groupId: string }) => {
    console.log("joinGroup event received:", payload);
    const { userId, groupId } = payload;
    const group = groups.find((g) => g.groupId === groupId);
    if (group && !group.members.includes(userId)) {
      group.members.push(userId);
      console.log("Updated group:", group);
      io.emit("groupUpdated", group);
      io.emit("groupList", { groups });
    }
  });

  socket.on("getGroups", () => {
    console.log("getGroups event received");
    socket.emit("groupList", { groups });
  });

  socket.on("sendMessage", (payload: any) => {
    console.log("sendMessage event received:", payload);
    if (payload.groupId) {
      io.to(payload.groupId).emit("message", payload);
    } else if (payload.receiverId) {
      const receiverSocket = usersArray.find(
        (u) => u.userId === payload.receiverId
      )?.socketId;
      if (receiverSocket) {
        io.to(receiverSocket).emit("message", payload);
      }
      socket.emit("message", payload);
    }
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
    const getUserToBeRemoved = usersArray.find(
      (item) => item.socketId === socket.id
    );
    console.log("🚀 ~ socket.on ~ getUserToBeRemoved:", getUserToBeRemoved);
    usersArray = usersArray.filter((user) => user.socketId !== socket.id);
    console.log("🚀 ~ groups=groups.map ~ groups:", groups);
    groups = groups.map((ele) => {
      return {
        ...ele,
        members: ele.members.filter(
          (user) => user !== getUserToBeRemoved?.userId
        ),
      };
    });
    console.log("🚀 ~ groups=groups.map ~ af groups:", groups);

    io.emit("userList", { users: usersArray });
    io.emit("groupList", { groups });
  });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
