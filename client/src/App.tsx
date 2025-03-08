import { PlayCircleFilled, Tv } from "@mui/icons-material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import TabContext from "@mui/lab/TabContext";
import TabList from "@mui/lab/TabList";
import TabPanel from "@mui/lab/TabPanel";
import {
  Alert,
  Box,
  Button,
  ButtonGroup,
  Card,
  Container,
  IconButton,
  InputProps,
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
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Tab from "@mui/material/Tab";
import {
  QueryClientProvider,
  useMutation,
  useQuery,
} from "@tanstack/react-query";
import "ace-builds/src-noconflict/ace";
import "ace-builds/src-noconflict/ext-language_tools";
import "ace-builds/src-noconflict/mode-pgsql";
import "ace-builds/src-noconflict/theme-github";
import AceEditor from "react-ace";
import { useEffect, useState } from "react";
import "./App.css";
import { createClient, getQueryClient, TRPCProvider, useTRPC } from "./trpc";
import type { ThoughtStrategies } from "@server/trpc/trpc.service";
import { match, P } from "ts-pattern";
import { Ace } from "ace-builds";

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

type SQLInputProps = { name: string } & (
  | {
      defaultValue: string;
      onChange: (value: string) => void;
    }
  | {
      value: string;
      readonly: boolean;
    }
);

function SQLInput(props: SQLInputProps) {
  return (
    <AceEditor
      mode="pgsql"
      theme="github"
      {...props}
      width="100%"
      setOptions={{
        enableBasicAutocompletion: true,
        enableLiveAutocompletion: true,
        enableSnippets: true,
      }}
    />
  );
}

type SqlInputTableProps = {
  setTable: (value: string) => void;
};

function SQLInputTable({ setTable }: SqlInputTableProps) {
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
            setTable(value);
          }}
        />
      </AccordionDetails>
    </Accordion>
  );
}

type SQLInputCreateTablesProps = {
  tables: string[];
  setTables: (tables: string[]) => void;
};

function SQLInputTables({ tables, setTables }: SQLInputCreateTablesProps) {
  const setTable = (i: number) => (value: string) => {
    const init = tables.slice(0, i);
    const end = tables.slice(i + 1);
    setTables([...init, value, ...end]);
  };

  return (
    <>
      {tables.map((_, i) => (
        <SQLInputTable key={`Table-${i}`} setTable={setTable(i)} />
      ))}
    </>
  );
}

type OutputPanelProps = {
  output: ThoughtStrategies | string;
  isLoadingOutput: boolean;
};

function OutputPanel({ output, isLoadingOutput }: OutputPanelProps) {
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
          {match(output)
            .with(P.string, (_output) => (
              <Typography variant="body1" gutterBottom>
                {_output}
              </Typography>
            ))
            .otherwise(({ think, strategies }) => (
              <>
                <Accordion>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                    sx={{
                      padding: "16px 24px", // Increased padding
                      borderBottom: "1px solid rgba(0, 0, 0, 0.12)", // Add a subtle bottom border
                      "&.MuiAccordionSummary-expandIconWrapper": {
                        marginLeft: "auto", // Push expand icon to the right
                      },
                    }}
                  >
                    <Typography variant="h6" sx={{ fontWeight: "600" }}>
                      Think
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails sx={{ padding: "24px" }}>
                    <Typography
                      variant="body1"
                      gutterBottom
                      sx={{
                        lineHeight: "1.6", // Improved line spacing for readability
                        fontSize: "0.9rem", // Slightly smaller font size for body text
                        color: "text.secondary", // Use secondary text color
                      }}
                    >
                      {think}
                    </Typography>
                  </AccordionDetails>
                </Accordion>
                <Accordion defaultExpanded>
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    aria-controls="panel1a-content"
                    id="panel1a-header"
                  >
                    <Typography variant="h6">Implementations</Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    {strategies.map((strategy, index) => (
                      <Accordion
                        key={index}
                        sx={{
                          backgroundColor: "rgba(0, 0, 0, 0.03)", // Subtle background color
                          "&:hover": {
                            backgroundColor: "rgba(0, 0, 0, 0.05)", // Hover effect
                          },
                          "&.MuiAccordionSummary-expandIconWrapper": {
                            marginLeft: "auto", // Push expand icon to the right
                          },
                        }}
                      >
                        <AccordionSummary
                          expandIcon={<ExpandMoreIcon />}
                          aria-controls={`panel${index}-content`}
                          id={`panel${index}-header`}
                          sx={{
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "space-between",
                            padding: "12px 20px", // Increased padding for better spacing
                            border: "1px solid rgba(0, 0, 0, 0.12)", // Softer border
                            marginBottom: "8px",
                          }}
                        >
                          <Box
                            sx={{
                              display: "flex",
                              flexDirection: "column",
                              flexGrow: 1,
                            }}
                          >
                            <Typography
                              variant="h6"
                              sx={{ fontWeight: "600", marginBottom: "4px" }}
                            >
                              {`${index + 1}. ${strategy.name}`}
                            </Typography>
                            <Typography
                              variant="body2"
                              sx={{
                                color: "text.secondary",
                                fontWeight: "500", // Slightly lighter font weight
                                fontSize: "0.875rem", // Adjust font size for better readability
                              }}
                            >
                              {strategy.description}
                            </Typography>
                          </Box>
                        </AccordionSummary>
                        <AccordionDetails>
                          <SQLInput
                            name={strategy.name}
                            value={[strategy.query, ...strategy.tables].join(
                              "\n\n",
                            )}
                            readonly={true}
                          />
                        </AccordionDetails>
                      </Accordion>
                    ))}
                  </AccordionDetails>
                </Accordion>
              </>
            ))}
        </Card>
      </TabPanel>
    </TabContext>
  );
}

type InputsProfiler = {
  query: string;
  tables: string[];
};

function SqlProfiler() {
  const trpc = useTRPC();

  const { mutateAsync, isPending } = useMutation<
    ThoughtStrategies,
    Error,
    InputsProfiler,
    unknown
  >(trpc.profile.mutationOptions());

  const [query, setQuery] = useState("");
  const [numTables, setNumTables] = useState(0);
  const [tables, setTables] = useState<string[]>(
    Array.from({ length: numTables }).fill("") as string[],
  );

  const [output, setOutput] = useState<ThoughtStrategies | string>("");

  const handleClick = async () => {
    const result = (await mutateAsync(
      { query, tables: tables.filter((table) => table !== "") },
      {
        onSuccess: (data) => {
          setOutput(JSON.stringify(data, null, 2));
        },
        onError: (error) => {
          setOutput(JSON.stringify(error, null, 2));
        },
      },
    )) as ThoughtStrategies;
    setOutput(result);
  };

  return (
    <Container component={Paper} sx={{ pt: 2, pb: 2 }}>
      <Typography variant="h1" align="center">
        SQL Profiler
      </Typography>
      <Box>
        <ButtonGroup variant="outlined" aria-label="control">
          <Button
            onClick={() => {
              setNumTables(numTables + 1);
              setTables([...tables, ""]);
            }}
          >
            Add Table
          </Button>
        </ButtonGroup>
        <IconButton
          onClick={handleClick}
          aria-label="run"
          color="primary"
          size="large"
        >
          <PlayCircleFilled />
        </IconButton>
      </Box>
      <Stack spacing={2} direction="row">
        <Stack spacing={2} sx={{ width: "50%" }}>
          <SQLInput
            defaultValue="-- Insert your SQL query here"
            onChange={(value) => setQuery(value)}
            name="DQL"
          />
          <SQLInputTables tables={tables} setTables={setTables} />
        </Stack>
        <Box sx={{ width: "50%" }}>
          <OutputPanel output={output} isLoadingOutput={isPending} />
        </Box>
      </Stack>
    </Container>
  );
}

function App() {
  const queryClient = getQueryClient();
  const [trpcClient] = useState(createClient);

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        <SqlProfiler />
      </TRPCProvider>
    </QueryClientProvider>
  );
}

export default App;
