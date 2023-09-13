module.exports = {
  preset: "ts-jest",
  testEnvironment: "node",
  roots: ["./test"],
  moduleNameMapper: {
    "@/(.*)": "<rootDir>/src/$1",
  },
  resolver: "./export_maps_resolver.js",
  transformIgnorePatterns: ["<rootDir>/node_modules/"],
  transform: {
    "^.+\\.(ts|tsx)?$": "ts-jest",
    "^.+\\.jsx?$": "babel-jest",
  },
}
