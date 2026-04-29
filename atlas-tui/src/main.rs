// ═══════════════════════════════════════════════════════════════════
// ATLAS TUI — Model Browser & Image/Video Generation Engine UI
// ═══════════════════════════════════════════════════════════════════

use crossterm::{
    event::{self, Event, KeyCode},
    terminal::{disable_raw_mode, enable_raw_mode, EnterAlternateScreen, LeaveAlternateScreen},
    ExecutableCommand,
};
use ratatui::{
    backend::CrosstermBackend,
    layout::{Alignment, Constraint, Direction, Layout},
    style::{Color, Modifier, Style},
    text::{Line, Span},
    widgets::{Block, Borders, List, ListItem, ListState, Paragraph},
    Frame, Terminal,
};
use std::{
    io::stdout,
    process::{Child, Command, Stdio},
    time::Instant,
};

struct App {
    running: bool,
    viewer: Option<Child>,
    start_time: Option<Instant>,
    files: Vec<String>,
    list_state: ListState,
}

fn main() -> anyhow::Result<()> {
    enable_raw_mode()?;
    stdout().execute(EnterAlternateScreen)?;

    let mut term = Terminal::new(CrosstermBackend::new(stdout()))?;
    
    let mut files = find_lammpstrj_files();
    let mut list_state = ListState::default();
    if !files.is_empty() {
        list_state.select(Some(0));
    }

    let mut app = App {
        running: true,
        viewer: None,
        start_time: None,
        files,
        list_state,
    };

    while app.running {
        term.draw(|f| ui(f, &mut app))?;

        // Poll non-blocking to allow animation
        if event::poll(std::time::Duration::from_millis(50))? {
            if let Event::Key(key) = event::read()? {
                match key.code {
                    KeyCode::Char('q') | KeyCode::Esc => app.running = false,
                    KeyCode::Up => app.previous(),
                    KeyCode::Down => app.next(),
                    KeyCode::Enter | KeyCode::Char(' ') => app.launch(None),
                    KeyCode::Char('k') => app.kill(),
                    KeyCode::Char('t') | KeyCode::Char('T') => app.launch(Some("top")),
                    KeyCode::Char('b') | KeyCode::Char('B') => app.launch(Some("bottom")),
                    KeyCode::Char('s') | KeyCode::Char('S') => app.launch(Some("side")),
                    KeyCode::Char('i') | KeyCode::Char('I') => app.launch(Some("111")),
                    KeyCode::Char('o') | KeyCode::Char('O') => app.launch(Some("101")),
                    _ => {}
                }
            }
        }

        // Check if viewer still running
        if let Some(ref mut child) = app.viewer {
            if child.try_wait()?.is_some() {
                app.viewer = None;
            }
        }
    }

    if let Some(mut child) = app.viewer {
        let _ = child.kill();
    }

    disable_raw_mode()?;
    stdout().execute(LeaveAlternateScreen)?;
    Ok(())
}

fn find_lammpstrj_files() -> Vec<String> {
    let mut files = vec![];
    let dirs_to_check = ["../atlas", "../atlas/scale_tests"];
    for dir in dirs_to_check {
        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.filter_map(Result::ok) {
                if let Some(name) = entry.file_name().to_str() {
                    if name.ends_with(".lammpstrj") {
                        files.push(entry.path().to_string_lossy().to_string());
                    }
                }
            }
        }
    }
    // Fallback if none found
    if files.is_empty() {
        files.push("DEMO 8-atom Mode (No files found!)".to_string());
    } else {
        files.sort();
    }
    files
}

impl App {
    fn previous(&mut self) {
        if self.files.is_empty() { return; }
        let i = match self.list_state.selected() {
            Some(i) => if i == 0 { self.files.len() - 1 } else { i - 1 },
            None => 0,
        };
        self.list_state.select(Some(i));
    }

    fn next(&mut self) {
        if self.files.is_empty() { return; }
        let i = match self.list_state.selected() {
            Some(i) => if i >= self.files.len() - 1 { 0 } else { i + 1 },
            None => 0,
        };
        self.list_state.select(Some(i));
    }

    fn launch(&mut self, angle: Option<&str>) {
        if self.viewer.is_some() {
            return; // Already running
        }

        let mut cmd = Command::new("cargo");
        cmd.arg("run").arg("--release").arg("--quiet")
           .current_dir("../atlas-view-native")
           .stdout(Stdio::null()).stderr(Stdio::null());
           
        cmd.arg("--");

        if let Some(i) = self.list_state.selected() {
            let path = &self.files[i];
            if !path.starts_with("DEMO") {
                cmd.arg(path);
            }
        }

        if let Some(a) = angle {
            cmd.arg("--angle").arg(a);
        }

        match cmd.spawn() {
            Ok(child) => {
                self.viewer = Some(child);
                self.start_time = Some(Instant::now());
            }
            Err(_) => {}
        }
    }

    fn kill(&mut self) {
        if let Some(mut child) = self.viewer.take() {
            let _ = child.kill();
        }
        self.start_time = None;
    }
}

fn ui(f: &mut Frame, app: &mut App) {
    let chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Min(0), Constraint::Length(3)])
        .split(f.area());

    let main_chunks = Layout::default()
        .direction(Direction::Horizontal)
        .constraints([Constraint::Percentage(40), Constraint::Percentage(60)])
        .split(chunks[0]);

    // Left pane: Files
    let items: Vec<ListItem> = app.files.iter().map(|s| {
        let name = std::path::Path::new(s).file_name().unwrap_or_default().to_string_lossy();
        ListItem::new(Line::from(vec![Span::raw(format!(" {}", name))]))
    }).collect();

    let files_list = List::new(items)
        .block(Block::default().title(" Simulation Models ").borders(Borders::ALL))
        .highlight_style(Style::default().bg(Color::DarkGray).add_modifier(Modifier::BOLD))
        .highlight_symbol(">> ");

    f.render_stateful_widget(files_list, main_chunks[0], &mut app.list_state);

    // Right pane: Status
    let right_chunks = Layout::default()
        .direction(Direction::Vertical)
        .constraints([Constraint::Percentage(60), Constraint::Percentage(40)])
        .split(main_chunks[1]);

    let block = Block::default()
        .title(" ATLAS Engine & View Controller ")
        .title_style(Style::default().fg(Color::Cyan).add_modifier(Modifier::BOLD))
        .borders(Borders::ALL)
        .border_style(Style::default().fg(if app.viewer.is_some() { Color::Green } else { Color::Blue }));

    let inner = block.inner(right_chunks[0]);
    f.render_widget(block, right_chunks[0]);

    // Animated molecule ASCII art
    let anim = animate_molecule(inner.width, app.start_time.map(|t| t.elapsed().as_millis() as f32 / 1000.0).unwrap_or(0.0));

    let status = if app.viewer.is_some() {
        let secs = app.start_time.map(|t| t.elapsed().as_secs()).unwrap_or(0);
        format!("▶ ENGINE RUNNING ({}s)", secs)
    } else {
        "◉ ENGINE STOPPED".into()
    };

    let text = format!("\n{}\n\n  [{}]", anim, status);

    let para = Paragraph::new(text)
        .alignment(Alignment::Center)
        .style(Style::default().fg(if app.viewer.is_some() { Color::Green } else { Color::White }));
    f.render_widget(para, inner);

    // System Monitoring Mockup
    let perf_block = Block::default()
        .title(" ATLAS Telemetry ")
        .borders(Borders::ALL);
    
    let perf_text = if app.viewer.is_some() {
        "\n  CPU: 12%  |  GPU: 48% (WGPU Base)  |  RAM: 1.2 GB\n  FPS: 144  |  Render Time: 2.1ms\n  Kernel: Nucleus"
    } else {
        "\n  CPU: 1%   |  GPU: 0%               |  RAM: 850 MB\n  FPS: 0    |  Render Time: --- \n  Kernel: Standby"
    };

    let perf_para = Paragraph::new(perf_text)
        .block(perf_block)
        .alignment(Alignment::Left)
        .style(Style::default().fg(Color::Gray));
    f.render_widget(perf_para, right_chunks[1]);

    // Hint bar
    let hint_text = " [↑/↓] Select File   [ENTER] Launch Native View   [T] Top  [B] Bottom  [S] Side  [I] 1-1-1  [O] 1-0-1   [K] Kill   [Q] Quit ";
    f.render_widget(
        Paragraph::new(hint_text)
            .style(Style::default().bg(Color::DarkGray).fg(Color::White).add_modifier(Modifier::BOLD))
            .alignment(Alignment::Center)
            .block(Block::default().borders(Borders::ALL)),
        chunks[1]
    );
}

fn animate_molecule(_w: u16, t: f32) -> String {
    let rot = t * 2.0;
    // Simple 8-atom cube animation manually hardcoded
    let mut lines = vec![
        "      ●                    ●      ",
        "        ·                  ·        ",
        "          ● · · · · · · ●          ",
        "          ·    ●  ●      ·          ",
        "          ● · · · · · · ●          ",
        "        ·                  ·        ",
        "      ●                    ●      ",
    ];

    if rot as i32 % 2 == 0 {
        lines[3] = "          ·       ●      ·          ";
    }

    lines.into_iter().collect::<Vec<_>>().join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;
    use ratatui::backend::TestBackend;

    #[test]
    fn test_ui_renders_correctly() {
        let backend = TestBackend::new(100, 30);
        let mut terminal = Terminal::new(backend).unwrap();
        
        // Mock app state
        let mut app = App {
            running: true,
            viewer: None,
            start_time: None,
            files: vec!["fake_simulation_model_1.lammpstrj".to_string(), "fake_simulation_model_2.lammpstrj".to_string()],
            list_state: ListState::default(),
        };
        app.list_state.select(Some(0));

        terminal.draw(|f| ui(f, &mut app)).unwrap();
        
        let buffer = terminal.backend().buffer();
        
        // Convert the buffer to a text format for assertion
        let mut screen_text = String::new();
        for y in 0..buffer.area.height {
            for x in 0..buffer.area.width {
                screen_text.push_str(buffer.get(x, y).symbol());
            }
            screen_text.push('\n');
        }
        
        assert!(screen_text.contains("Simulation Models"));
        assert!(screen_text.contains("ATLAS Engine"));
        assert!(screen_text.contains("fake_simulation_model_1.lammpstrj"));
        assert!(screen_text.contains("fake_simulation_model_2.lammpstrj"));
    }
}
