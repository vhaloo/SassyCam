import threading

try:
    import rclpy
    from rclpy.node import Node
    from std_msgs.msg import String
    ROS_AVAILABLE = True
except ImportError:
    ROS_AVAILABLE = False

class ROSManager:
    def __init__(self, node_name="sassy_cam_node", topic="/sassy_cam/roast"):
        self.enabled = False
        self.node_name = node_name
        self.topic_name = topic
        self.node = None
        self.publisher = None
        self.thread = None

    def start(self):
        if not ROS_AVAILABLE:
            print("ROS 2 (rclpy) not found. ROS features disabled.")
            return False
        
        try:
            if not rclpy.ok():
                rclpy.init()
            
            self.node = Node(self.node_name)
            self.publisher = self.node.create_publisher(String, self.topic_name, 10)
            self.enabled = True
            
            # Spin in a background thread
            self.thread = threading.Thread(target=rclpy.spin, args=(self.node,), daemon=True)
            self.thread.start()
            print(f"ROS 2 Node '{self.node_name}' started. Publishing to '{self.topic_name}'.")
            return True
        except Exception as e:
            print(f"Failed to start ROS 2: {e}")
            self.enabled = False
            return False

    def publish_roast(self, text):
        if self.enabled and self.publisher:
            msg = String()
            msg.data = text
            self.publisher.publish(msg)
            print(f"Published roast to ROS: {text}")

    def stop(self):
        if self.node:
            self.node.destroy_node()
        if ROS_AVAILABLE and rclpy.ok():
            rclpy.shutdown()
