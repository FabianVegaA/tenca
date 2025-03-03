import { useState } from "react";
import "./App.css";
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  Container,
  IconButton,
  Paper,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from "@mui/material";
import AceEditor from "react-ace";
import "ace-builds/src-noconflict/mode-pgsql";
import "ace-builds/src-noconflict/theme-github";
import "ace-builds/src-noconflict/ext-language_tools";
import { Create, PlayCircleFilled } from "@mui/icons-material";
import Accordion from "@mui/material/Accordion";
import AccordionSummary from "@mui/material/AccordionSummary";
import AccordionDetails from "@mui/material/AccordionDetails";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Tab from "@mui/material/Tab";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";

function createData(stratergy: string, time: number, memory: number) {
  return { stratergy, time, memory };
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
  defaultValue: string;
  onChange: (value: string) => void;
  name: string;
};

function SQLInput({ defaultValue: value, onChange, name }: SQLInputProps) {
  return (
    <AceEditor
      mode="pgsql"
      theme="github"
      defaultValue={value}
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

type SQLInputCreateTablesProps = {
  numTables: number;
  onChange: (value: string) => void;
};

function SQLInputTable() {
  const [name, setName] = useState<string>("");
  return (
    <Accordion>
      <AccordionSummary
        expandIcon={<ExpandMoreIcon />}
        aria-controls="panel2-content"
        id="panel2-header"
      >
        <Typography component="span" variant="overline" color="textSecondary">
          Table {name}
        </Typography>
      </AccordionSummary>
      <AccordionDetails>
        <SQLInput
          name={name}
          defaultValue="-- CREATE TABLE my_table (
            id INT PRIMARY KEY,
              name VARCHAR(100)
            );"
          onChange={(value) => {
            const createTableRegex =
              /CREATE\s+TABLE\s+(IF NOT EXISTS\s+)?(?<tableName>[a-zA-Z_][a-zA-Z0-9_]*)/gi;
            const tableName = createTableRegex.exec(value)?.groups?.tableName;
            if (tableName) setName(tableName);
            console.log("Table name:", tableName, "Value:", value);
          }}
        />
      </AccordionDetails>
    </Accordion>
  );
}

function SQLInputTables({ numTables, onChange }: SQLInputCreateTablesProps) {
  return (
    <>
      {Array.from({ length: numTables }).map((i) => (
        <SQLInputTable key={`Table-${i}`} />
      ))}
    </>
  );
}

function OutputPanel() {
  type Tabs = "Logs" | "Stats" | "Code";

  const [value, setValue] = useState<Tabs>("Logs");

  const handleChange = (event: React.SyntheticEvent, newValue: Tabs) => {
    setValue(newValue);
  };

  return (
    <TabContext value={value}>
      <Box sx={{ borderBottom: 1, borderColor: "divider" }}>
        <TabList onChange={handleChange} aria-label="lab API tabs example">
          <Tab label="Logs" value="Logs" />
          <Tab label="Stats" value="Stats" />
          <Tab label="Code" value="Code" />
        </TabList>
      </Box>
      <TabPanel value="Logs">
        <Alert severity="success">This is a success Alert.</Alert>
        <Alert severity="info">This is an info Alert.</Alert>
        <Alert severity="warning">This is a warning Alert.</Alert>
        <Alert severity="error">This is an error Alert.</Alert>
      </TabPanel>
      <TabPanel value="Stats">
        <BasicTable />
      </TabPanel>
      <TabPanel value="Code">
        <Card>
          <Typography variant="body1" gutterBottom>
            body1. Lorem ipsum dolor sit amet, consectetur adipisicing elit.
            Quos blanditiis tenetur unde suscipit, quam beatae rerum inventore
            consectetur, neque doloribus, cupiditate numquam dignissimos laborum
            fugiat deleniti? Eum quasi quidem quibusdam.
          </Typography>
        </Card>
      </TabPanel>
    </TabContext>
  );
}

function App() {
  const [numTables, setNumTables] = useState(0);
  return (
    <Container component={Paper} sx={{ pt: 2, pb: 2 }}>
      <Typography variant="h1" align="center">
        SQL Profiler
      </Typography>
      <Box>
        <ButtonGroup variant="outlined" aria-label="control">
          <Button onClick={() => setNumTables(numTables + 1)}>
            {" "}
            Add Table{" "}
          </Button>
        </ButtonGroup>
        <IconButton aria-label="run" color="primary" size="large">
          <PlayCircleFilled />
        </IconButton>
      </Box>
      <Stack spacing={2} direction="row">
        <Stack spacing={2} sx={{ width: "50%" }}>
          <SQLInput
            defaultValue="-- Insert your SQL query here"
            onChange={(value) => console.log(value)}
            name="DQL"
          />
          <SQLInputTables
            numTables={numTables}
            onChange={(value) => console.log(value)}
          />
        </Stack>
        <Box sx={{ width: "50%" }}>
          <OutputPanel />
        </Box>
      </Stack>
    </Container>
  );
}

export default App;
