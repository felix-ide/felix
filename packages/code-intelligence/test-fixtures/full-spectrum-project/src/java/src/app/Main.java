package app;

import java.util.List;

public class Main implements Runnable, GraphProcessor {
    private final List<String> nodes;

    public Main(List<String> nodes) {
        this.nodes = nodes;
    }

    @Override
    public void run() {
        for (String node : nodes) {
            System.out.println("Processing node " + node);
        }
    }

    @Override
    public void process(String nodeId) {
        System.out.println("process " + nodeId);
    }

    public static void main(String[] args) {
        new Main(List.of("n1", "n2")).run();
    }
}
