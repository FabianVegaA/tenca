import { useState } from "react";
import "./App.css";
import {
  Box,
  Container,
  Grid2 as Grid,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-pgsql";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";
import { PlayCircleFilled } from "@mui/icons-material";

function createData(stratergy: string, time: number, memory: number) {
  return {
    stratergy,
    time,
    memory,
  };
}

const rows = [
  createData("Index & Join", 10, 20),
  createData("Binary Search", 15, 25),
  createData("Linear Search", 20, 30),
  createData("Hash Table", 25, 35),
  createData("Sorting", 30, 40),
];

function BasicTable() {
  return (
    <TableContainer component={Paper}>
      <Table aria-label="simple table">
        <TableHead>
          <TableRow>
            <TableCell>Stratergy</TableCell>
            <TableCell align="right">Time</TableCell>
            <TableCell align="right">Memory</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((row) => (
            <TableRow
              key={row.stratergy}
              sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
            >
              <TableCell component="th" scope="row">
                {row.stratergy}
              </TableCell>
              <TableCell align="right">{row.time}</TableCell>
              <TableCell align="right">{row.memory}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

type SQLInputProps = {
  value: string;
  onChange: (value: string) => void;
  name: string;
};

function SQLInput({ value, onChange, name }: SQLInputProps) {
  return (
    <AceEditor
      mode="pgsql"
      theme="github"
      value={value}
      onChange={onChange}
      name={name}
      width="100%"
      setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
      }}
    />
  );
}

function App() {
  const [numTables, setNumTables] = useState(2);
  return (
    <Container component={Paper} sx={{ pt: 2, pb: 2 }}>
      <Typography variant="h1" align="center">
        SQL Profiler
      </Typography>
      <Stack spacing={2} direction="row">
        <Stack spacing={2} sx={{ width: "50%" }}>
          <SQLInput
            value="-- Insert your SQL query here"
            onChange={(value) => console.log(value)}
            name="DQL"
          />
          {Array.from({ length: numTables }, (_, i) => (
            <SQLInput
              key={`DDL${i + 1}`}
              name={`DDL${i + 1}`}
              value="-- CREATE TABLE my_table (
              id INT PRIMARY KEY,
                name VARCHAR(100)
              );"
              onChange={(value) => console.log(value)}
            />
          ))}
        </Stack>
        <Box sx={{ width: "50%" }}>
          <Stack direction="row-reverse" spacing={1}>
            <IconButton aria-label="run" color="primary" size="large">
              <PlayCircleFilled />
            </IconButton>
          </Stack>
          <BasicTable />
        </Box>
      </Stack>
    </Container>
  );
}

export default App;
