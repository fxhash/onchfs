module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./test"],
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1",
  },
}
